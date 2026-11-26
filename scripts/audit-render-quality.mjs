import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2] ?? 'before';
if (!['before', 'after', 'antialias'].includes(phase))
  throw new Error('Use before, after or antialias.');
const url = process.env.FUZZS_PREVIEW ?? 'http://127.0.0.1:5173/';
const directory = `artifacts/part-16/${phase}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const profiles =
  phase === 'antialias'
    ? ['off', 'fxaa', 'msaa'].map((aa) => ({
        name: aa,
        width: 3440,
        height: 1440,
        dpr: 1,
        aa,
      }))
    : [
        { name: 'ultrawide', width: 3440, height: 1440, dpr: 1 },
        { name: 'desktop', width: 1920, height: 1080, dpr: 1 },
        { name: 'mobile', width: 390, height: 844, dpr: 2, mobile: true },
      ];
const results = [];
try {
  for (const { name, width, height, dpr, mobile, aa } of profiles) {
    const setting = phase === 'before' ? 'high' : 'ultra';
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: dpr,
      isMobile: !!mobile,
      hasTouch: !!mobile,
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      ({ setting, aa }) => {
        localStorage.setItem('fuzzs-quality', setting);
        localStorage.setItem('fuzzs-locale', 'pt');
        localStorage.setItem('fuzzs-core', 'blue');
        if (aa) localStorage.setItem('fuzzs-render-settings-v1', JSON.stringify({ ultra: { aa } }));
      },
      { setting, aa },
    );
    await page.goto(url);
    await page.locator('#home[data-boot="running"]').waitFor({ timeout: 45000 });
    const read = await page.evaluate(async () => {
      const canvas = document.querySelector('.production-canvas canvas');
      const source = performance
        .getEntriesByType('resource')
        .find((entry) => entry.name.includes('/@react-three_fiber.js'));
      if (!canvas || !source) throw new Error('Run against the development server.');
      const fiber = await import(source.name);
      const { gl, scene, camera } = fiber._roots.get(canvas).store.getState();
      const context = gl.getContext();
      const box = canvas.getBoundingClientRect();
      const extension = context.getExtension('WEBGL_debug_renderer_info');
      const maps = new Map();
      let lights = 0;
      const shadows = [];
      scene.traverse((object) => {
        if (object.isLight) lights++;
        if (object.isLight && object.castShadow && object.shadow)
          shadows.push([
            object.name,
            object.shadow.mapSize.toArray(),
            object.shadow.camera.near,
            object.shadow.camera.far,
          ]);
        if (!object.material) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          for (const map of Object.values(material)) {
            if (!map?.isTexture || maps.has(map.uuid)) continue;
            maps.set(map.uuid, {
              size: [map.image?.width, map.image?.height],
              mipmaps: map.generateMipmaps,
              minFilter: map.minFilter,
              magFilter: map.magFilter,
              anisotropy: map.anisotropy,
              colorSpace: map.colorSpace,
            });
          }
        }
      });
      const prod = canvas.closest('.production-canvas');
      return {
        viewport: [innerWidth, innerHeight],
        css: [box.width, box.height],
        cssTransform: getComputedStyle(canvas).transform,
        buffer: [context.drawingBufferWidth, context.drawingBufferHeight],
        dpr: devicePixelRatio,
        rendererDpr: gl.getPixelRatio(),
        maxSamples: context.getParameter(context.MAX_SAMPLES),
        maxTextureSize: gl.capabilities.maxTextureSize,
        maxAnisotropy: gl.capabilities.getMaxAnisotropy(),
        contextAA: context.getContextAttributes().antialias,
        renderer: context.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
        quality: prod.dataset.quality,
        aa: prod.dataset.antialias ?? 'off',
        sampleCount: Number(prod.dataset.samples ?? context.getParameter(context.SAMPLES)),
        post: prod.dataset.postprocessing ?? 'off',
        effectiveScale: (100 * context.drawingBufferWidth) / (box.width * devicePixelRatio),
        dynamicResolution: prod.dataset.dynamicResolution === 'true',
        sceneFrame: {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          ...gl.info.memory,
          lights,
        },
        toneMapping: gl.toneMapping,
        outputColorSpace: gl.outputColorSpace,
        fog: scene.fog ? [scene.fog.near, scene.fog.far] : null,
        camera: {
          position: camera.position.toArray(),
          fov: camera.fov,
          zoom: camera.zoom,
          near: camera.near,
          far: camera.far,
        },
        shadows,
        textures: Array.from(maps.values()).reduce((groups, map) => {
          const key = JSON.stringify(map);
          groups[key] = (groups[key] ?? 0) + 1;
          return groups;
        }, {}),
      };
    });
    await page.screenshot({
      path: `${directory}/${name}.png`,
      scale: 'css',
      clip: aa ? { x: 672, y: 469, width: 1244, height: 448 } : undefined,
    });
    if (aa) {
      results.push({ name, ...read, errors });
      console.log(
        JSON.stringify({ name, buffer: read.buffer, aa: read.aa, samples: read.sampleCount }),
      );
      await page.close();
      continue;
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const performanceSample = await page.evaluate(async () => {
      const source = performance
        .getEntriesByType('resource')
        .find((entry) => entry.name.includes('/@react-three_fiber.js'));
      const { _roots } = await import(source.name);
      const { scene } = _roots
        .get(document.querySelector('.production-canvas canvas'))
        .store.getState();
      const frames = [];
      const afterRender = scene.onAfterRender;
      scene.onAfterRender = (...args) => {
        afterRender.apply(scene, args);
        frames.push(performance.now());
      };
      try {
        const start = performance.now();
        while (performance.now() - start < 3600) await new Promise(requestAnimationFrame);
      } finally {
        scene.onAfterRender = afterRender;
      }
      const duration = frames.at(-1) - frames[0];
      return frames.length > 1 && duration > 0
        ? {
            samples: frames.length,
            fps: ((frames.length - 1) * 1000) / duration,
            frameMs: duration / (frames.length - 1),
          }
        : { samples: frames.length, fps: null, frameMs: null };
    });
    results.push({ name, ...read, timing: performanceSample, errors });
    console.log(
      JSON.stringify({
        name,
        css: read.css,
        buffer: read.buffer,
        quality: read.quality,
        aa: read.aa,
        ...performanceSample,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${directory}/measurements.json`, JSON.stringify(results, null, 2));
}
if (results.some(({ errors }) => errors.length)) process.exitCode = 1;
