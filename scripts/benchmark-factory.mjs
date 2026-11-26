import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const phase = process.argv[2] ?? 'before';
const url = process.env.FUZZS_PREVIEW ?? 'http://127.0.0.1:5173/';
const target = new URL(url);
if (!['localhost', '127.0.0.1'].includes(target.hostname))
  throw new Error('Use a local Vite server.');
if (!/^[a-z0-9-]+$/.test(phase)) throw new Error('Use a simple phase name.');
const folder = `artifacts/part-17/${phase}`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });

const profiles = [
  { name: 'desktop', width: 1280, height: 900, dpr: 1, theme: 'blue' },
  { name: 'ultrawide', width: 3440, height: 1440, dpr: 1, theme: 'blue' },
  {
    name: 'mobile',
    width: 390,
    height: 844,
    dpr: 2,
    theme: 'amber',
    isMobile: true,
    hasTouch: true,
  },
];
const summary = [];
const selected = process.env.FUZZS_BENCH_CASE;
const bloom = process.env.FUZZS_BENCH_BLOOM === '1';
if (phase === 'before' && bloom) throw new Error('Keep Bloom off for the ULTRA reference.');
if (selected && !profiles.some(({ name }) => name === selected))
  throw new Error('Unknown benchmark viewport.');
const warm = async (page) => {
  await page.goto(target.href);
  await page.locator('#home[data-boot="running"]').waitFor({ timeout: 55000 });
  await page.locator('.production-canvas[data-antialias]').waitFor();
};
try {
  for (const profile of profiles.filter(({ name }) => !selected || selected === name)) {
    const { name, width, height, dpr, theme, isMobile, hasTouch } = profile;
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: dpr,
      isMobile,
      hasTouch,
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ theme, bloom }) => {
        localStorage.setItem('fuzzs-quality', 'ultra');
        localStorage.setItem('fuzzs-core', theme);
        localStorage.setItem('fuzzs-locale', 'pt');
        if (bloom)
          localStorage.setItem(
            'fuzzs-render-settings-v1',
            JSON.stringify({ ultra: { post: 'bloom' } }),
          );
        let seed = 19750325;
        Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      },
      { theme, bloom },
    );
    try {
      await warm(page);
    } catch {
      await warm(page);
    }
    const sceneReadyMs = await page.evaluate(() => performance.now());
    const shot = await page.screenshot({ path: `${folder}/${name}.png`, scale: 'device' });
    let comparison;
    if (phase !== 'before' && !bloom) {
      const baseline = await readFile(`artifacts/part-17/before/${name}.png`);
      comparison = await page.evaluate(
        async ([reference, candidate]) => {
          async function pixels(base64) {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const draw = canvas.getContext('2d');
            draw.drawImage(image, 0, 0);
            return draw.getImageData(0, 0, image.width, image.height);
          }
          const [first, second] = await Promise.all([pixels(reference), pixels(candidate)]);
          if (first.width !== second.width || first.height !== second.height)
            throw new Error('Screenshot dimensions differ.');
          let changed = 0,
            sum = 0,
            max = 0,
            changedScene = 0;
          const changedPixels = [];
          const viewport = document
            .querySelector('.production-canvas canvas')
            .getBoundingClientRect();
          const x0 = Math.ceil(viewport.left * devicePixelRatio);
          const x1 = Math.floor(viewport.right * devicePixelRatio);
          const y0 = Math.ceil(viewport.top * devicePixelRatio);
          const y1 = Math.floor(viewport.bottom * devicePixelRatio);
          for (let index = 0; index < first.data.length; index += 4) {
            let delta = 0;
            for (let channel = 0; channel < 3; channel++) {
              const change = Math.abs(first.data[index + channel] - second.data[index + channel]);
              sum += change;
              delta = Math.max(delta, change);
            }
            const x = (index / 4) % first.width;
            const y = Math.floor(index / 4 / first.width);
            if (delta) {
              changed++;
              if (changedPixels.length < 12) changedPixels.push([x, y, delta]);
              if (x >= x0 && x < x1 && y >= y0 && y < y1) changedScene++;
            }
            max = Math.max(max, delta);
          }
          const total = first.width * first.height;
          return {
            pixels: total,
            changed,
            changedScene,
            changedPixels,
            maxChannelDelta: max,
            meanAbsoluteChannelDelta: sum / (total * 3),
          };
        },
        [baseline.toString('base64'), shot.toString('base64')],
      );
    }
    const benchmark = await page.evaluate(
      async ({ profileSystems, shadowProbe }) => {
        const canvas = document.querySelector('.production-canvas canvas');
        const module = performance
          .getEntriesByType('resource')
          .find(({ name }) => name.includes('/@react-three_fiber.js'));
        const { _roots } = await import(module.name);
        const root = _roots.get(canvas).store;
        const { gl, scene, camera, advance, setFrameloop } = root.getState();
        const context = gl.getContext();
        const renderer = context.getExtension('WEBGL_debug_renderer_info');
        const timer = context.getExtension('EXT_disjoint_timer_query_webgl2');
        const visual = canvas.closest('.production-canvas').dataset;
        const quantile = (values, q) => {
          const sorted = [...values].sort((a, b) => a - b);
          return sorted[Math.ceil(sorted.length * q) - 1] ?? null;
        };
        const stats = () => ({
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
        });
        const records = scene.children.map((child) => {
          const names = [];
          let meshes = 0,
            casters = 0,
            transparent = 0;
          child.traverse((object) => {
            if (object.name && names.length < 10) names.push(object.name);
            if (object.isMesh) {
              meshes++;
              if (object.castShadow) casters++;
              if (
                (Array.isArray(object.material) ? object.material : [object.material]).some(
                  (material) => material?.transparent,
                )
              )
                transparent++;
            }
          });
          return { type: child.type, names, meshes, casters, transparent };
        });
        const mapSizes = [];
        scene.traverse((object) => {
          if (object.isLight && object.castShadow)
            mapSizes.push([object.name, ...object.shadow.mapSize.toArray()]);
        });
        const box = canvas.getBoundingClientRect();
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance
          .getEntriesByType('resource')
          .filter(({ name }) => name.startsWith(location.origin) && !name.includes('sockjs'));
        const timings = [];
        const cpu = [];
        const movie = [];
        const queries = [];
        const original = gl.render;
        let sequence = 0;
        let geometryFrame;
        setFrameloop('never');
        // Reduced motion keeps the exact belt, event and light state used in the reference capture.
        gl.render = function (...args) {
          const start = performance.now();
          const result = original.apply(this, args);
          if (args[0] === scene) cpu.push(performance.now() - start);
          return result;
        };
        try {
          for (let index = 0; index < 8; index++) {
            await new Promise(requestAnimationFrame);
            const start = performance.now();
            const query = timer && context.createQuery();
            if (query) context.beginQuery(timer.TIME_ELAPSED_EXT, query);
            advance(++sequence / 60, false);
            if (query) {
              context.endQuery(timer.TIME_ELAPSED_EXT);
              queries.push(query);
            }
            context.finish();
            timings.push(performance.now() - start);
            movie.push(performance.now());
            geometryFrame = stats();
          }
        } finally {
          gl.render = original;
        }
        const intervals = movie.slice(1).map((time, index) => time - movie[index]);
        const gpuTimes = [];
        for (const query of queries) {
          if (
            !context.getParameter(timer.GPU_DISJOINT_EXT) &&
            context.getQueryParameter(query, context.QUERY_RESULT_AVAILABLE)
          ) {
            gpuTimes.push(context.getQueryParameter(query, context.QUERY_RESULT) / 1e6);
          }
          context.deleteQuery(query);
        }
        const ablations = [];
        if (shadowProbe) {
          const saved = {
            update: gl.shadowMap.needsUpdate,
            fog: scene.fog,
            ratio: gl.getPixelRatio(),
          };
          const work = (options = {}) => {
            const before = performance.now();
            gl.shadowMap.needsUpdate = options.shadows !== false;
            gl.render(scene, camera);
            context.finish();
            return { ms: performance.now() - before, ...stats() };
          };
          const classify = {
            mainConveyor: /conveyor-rollers|conveyor-drive/,
            secondaryConveyors: /upper-transfer|maintenance-return/,
            containers: /project-crate-/,
            turrets: /factory-turret-/,
            supervisor: /supervisor-eye|supervisor-ceiling-arm/,
            pipes: /pipe-|gel-line|GEL-/,
            vegetation: /vegetation|floor-breaks/,
            lighting: /fluorescent-/,
            scanner: /scanner-wash|scanner-beam/,
            particles: /sparks|particles/,
          };
          const sample = async (sampleName, restore, options) => {
            const samples = [];
            for (let index = 0; index < 3; index++) {
              await new Promise(requestAnimationFrame);
              const start = performance.now();
              const result = work(options);
              await new Promise(requestAnimationFrame);
              samples.push({ ...result, displayMs: performance.now() - start });
            }
            const { ms, displayMs, ...counts } = samples[1];
            ablations.push({
              name: sampleName,
              medianSubmitAndFinishMs: quantile(
                samples.map(({ ms }) => ms),
                0.5,
              ),
              medianDisplayMs: quantile(
                samples.map(({ displayMs }) => displayMs),
                0.5,
              ),
              ...counts,
            });
            restore?.();
          };
          await sample('full');
          await sample('reuse-shadow-maps', undefined, { shadows: false });
          if (profileSystems) {
            for (const [system, pattern] of Object.entries(classify)) {
              const matched = [];
              scene.traverse((object) => {
                if (
                  object.visible &&
                  pattern.test(object.name) &&
                  !matched.some((parent) => {
                    for (let ancestor = object.parent; ancestor; ancestor = ancestor.parent)
                      if (ancestor === parent) return true;
                    return false;
                  })
                ) {
                  object.visible = false;
                  matched.push(object);
                }
              });
              if (matched.length)
                await sample(system, () =>
                  matched.forEach((object) => {
                    object.visible = true;
                  }),
                );
            }
            const transparent = [];
            scene.traverse((object) => {
              if (
                object.visible &&
                (object.isMesh || object.isSprite || object.isPoints) &&
                object.material?.transparent
              ) {
                transparent.push(object);
                object.visible = false;
              }
            });
            await sample('transparent', () =>
              transparent.forEach((object) => {
                object.visible = true;
              }),
            );
            scene.fog = null;
            await sample('fog', () => {
              scene.fog = saved.fog;
            });
            gl.setPixelRatio(saved.ratio * 0.5);
            await sample('fill-rate-probe-50-percent', () => gl.setPixelRatio(saved.ratio));
          }
          gl.shadowMap.needsUpdate = saved.update;
        }
        const deltaEnd = navigation?.domContentLoadedEventEnd ?? null;
        return {
          renderer: context.getParameter(renderer?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
          timerQueryAvailable: Boolean(timer),
          reportedJsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
          resolution: {
            viewport: [innerWidth, innerHeight],
            css: [box.width, box.height],
            buffer: [context.drawingBufferWidth, context.drawingBufferHeight],
            dpr: devicePixelRatio,
            scale: visual.renderScale,
            aa: visual.antialias,
            samples: Number(visual.samples),
          },
          camera: {
            position: camera.position.toArray(),
            quaternion: camera.quaternion.toArray(),
            fov: camera.fov,
            zoom: camera.zoom,
            near: camera.near,
            far: camera.far,
          },
          quality: visual.quality,
          post: visual.postprocessing,
          shadowMaps: mapSizes,
          stableFrame: geometryFrame,
          timing: {
            frames: timings.length,
            fps: (intervals.length * 1000) / intervals.reduce((sum, value) => sum + value, 0),
            frameP50: quantile(intervals, 0.5),
            frameP90: quantile(intervals, 0.9),
            frameP95: quantile(intervals, 0.95),
            completedFrameP50: quantile(timings, 0.5),
            cpuSubmitP50: quantile(cpu, 0.5),
            gpuP50: quantile(gpuTimes, 0.5),
          },
          load: {
            domContentLoadedMs: deltaEnd,
            transferredBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
            decodedBytes: resources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
            requests: resources.length,
          },
          topLevel: profileSystems ? records : undefined,
          ablations,
        };
      },
      {
        profileSystems: phase === 'before' && name === 'desktop',
        shadowProbe: name === 'desktop' && !bloom,
      },
    );
    summary.push({
      name,
      theme,
      comparison,
      ...benchmark,
      load: { ...benchmark.load, sceneReadyMs },
      errors,
    });
    console.log(
      JSON.stringify({
        name,
        comparison,
        ...benchmark.timing,
        ...benchmark.stableFrame,
        ablations: benchmark.ablations,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(
    `${folder}/${selected ? `measurements-${selected}` : 'measurements'}.json`,
    JSON.stringify(summary, null, 2),
  );
}
if (summary.some(({ errors }) => errors.length)) process.exitCode = 1;
