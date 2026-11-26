import { chromium } from '@playwright/test';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { totalmem, cpus, platform, release } from 'node:os';
import { preview } from 'vite';

const phase = process.argv[2] ?? 'after';
const before = phase.endsWith('before');
const stressOnly = process.argv.includes('--stress-only');
const directory = `artifacts/performance/${phase}`;
await mkdir(directory, { recursive: true });
const files = await Promise.all(
  (await readdir('dist/assets')).map(async (name) => {
    const bytes = await readFile(`dist/assets/${name}`);
    return { name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
  }),
);
const publicFiles = await Promise.all(
  (await readdir('public', { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map(async (entry) => ({
      name: entry.name,
      bytes: (await stat(`${entry.parentPath}/${entry.name}`)).size,
    })),
);
const environment = {
  platform: platform(),
  release: release(),
  cpu: cpus()[0]?.model,
  logicalCores: cpus().length,
  ramBytes: totalmem(),
};
const server = await preview({ preview: { host: '127.0.0.1', port: 5181, strictPort: true } });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const result = {
  environment,
  chromium: browser.version(),
  files,
  publicFiles,
  samples: [],
  inventory: [],
};

try {
  for (const [quality, width, height] of stressOnly
    ? []
    : [
        ['auto', 1440, 1000],
        ['auto', 390, 844],
        ...(!before ? ['low', 'medium', 'high', 'off'].map((mode) => [mode, 1440, 1000]) : []),
      ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript((mode) => {
      localStorage.setItem('fuzzs-quality', mode);
      const counters = { draws: 0, triangles: 0, firstDrawMs: null };
      const vitals = { lcpMs: null, cls: 0, longTasks: [], interactions: [] };
      window.profile = { counters, vitals };
      for (const [name, countIndex, instanceIndex] of [
        ['drawArrays', 2],
        ['drawElements', 1],
        ['drawArraysInstanced', 2, 3],
        ['drawElementsInstanced', 1, 4],
      ]) {
        const prototype = WebGL2RenderingContext.prototype;
        const draw = prototype[name];
        prototype[name] = function (...args) {
          counters.firstDrawMs ??= performance.now();
          counters.draws++;
          const count = args[countIndex];
          const primitives =
            args[0] === this.TRIANGLES
              ? Math.floor(count / 3)
              : args[0] === this.TRIANGLE_STRIP || args[0] === this.TRIANGLE_FAN
                ? Math.max(0, count - 2)
                : 0;
          counters.triangles +=
            primitives * (instanceIndex === undefined ? 1 : args[instanceIndex]);
          return draw.apply(this, args);
        };
      }
      const observe = (type, report) => {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
        new PerformanceObserver((list) => list.getEntries().forEach(report)).observe({
          type,
          buffered: true,
          ...(type === 'event' ? { durationThreshold: 16 } : {}),
        });
      };
      observe('largest-contentful-paint', (entry) => {
        vitals.lcpMs = entry.startTime;
      });
      observe('layout-shift', (entry) => {
        if (!entry.hadRecentInput) vitals.cls += entry.value;
      });
      observe('longtask', (entry) =>
        vitals.longTasks.push({ start: entry.startTime, duration: entry.duration }),
      );
      observe('event', (entry) => {
        if (entry.interactionId) vitals.interactions.push(entry.duration);
      });
    }, quality);
    await page.goto('http://127.0.0.1:5181/');
    await page.locator('.factory-project-controls button').last().waitFor();
    if (quality !== 'off') {
      await page.waitForFunction(() => {
        const stage = document.querySelector('#home')?.getAttribute('data-boot');
        return window.profile.counters.draws > 0 && (!stage || stage === 'running');
      });
    }
    await page.waitForTimeout(5000);
    const data = await page.evaluate(async () => {
      const { counters, vitals } = window.profile;
      const canvas = document.querySelector('canvas[aria-hidden="true"]');
      const gl = canvas?.getContext('webgl2');
      const rendererInfo = gl?.getExtension('WEBGL_debug_renderer_info');
      const next = () => new Promise(requestAnimationFrame);
      const start = await next();
      let previous = start,
        initialDraws = counters.draws,
        initialTriangles = counters.triangles;
      const frameTimes = [];
      while (previous - start < 5000) {
        const frame = await next();
        frameTimes.push(frame - previous);
        previous = frame;
      }
      frameTimes.sort((a, b) => a - b);
      const percentile = (p) => frameTimes[Math.ceil(frameTimes.length * p) - 1];
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        effective: document.querySelector('.production-canvas')?.dataset.quality ?? null,
        devicePixelRatio,
        canvas: canvas ? [canvas.width, canvas.height] : null,
        renderer: gl?.getParameter(rendererInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) ?? null,
        maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) ?? null,
        antialias: gl?.getContextAttributes().antialias ?? null,
        fps: (frameTimes.length * 1000) / (previous - start),
        frames: frameTimes.length,
        elapsedMs: previous - start,
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        drawsPerFrame: (counters.draws - initialDraws) / frameTimes.length,
        trianglesPerFrame: (counters.triangles - initialTriangles) / frameTimes.length,
        firstDrawMs: counters.firstDrawMs,
        lcpMs: vitals.lcpMs,
        clsSum: vitals.cls,
        fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        transferredBytes:
          navigation.transferSize +
          performance
            .getEntriesByType('resource')
            .reduce((total, entry) => total + entry.transferSize, 0),
        longTaskBlockingMsThroughSample: vitals.longTasks.reduce(
          (total, entry) => total + Math.max(0, entry.duration - 50),
          0,
        ),
      };
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const { metrics } = await cdp.send('Performance.getMetrics');
    const heapBytes = metrics.find(({ name }) => name === 'JSHeapUsedSize')?.value ?? null;
    await page.screenshot({ path: `${directory}/${quality}-${width}.png` });
    await page.locator('.factory-project-controls button').first().press('Enter');
    await page.locator('.factory-inspection h2').waitFor();
    const interactionMs = await page.evaluate(
      () => Math.max(0, ...window.profile.vitals.interactions) || null,
    );
    const row = { quality, width, height, ...data, heapBytes, interactionMs, errors };
    result.samples.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }

  if (process.argv.includes('--inventory')) {
    for (const quality of before ? ['auto'] : ['low', 'medium', 'high']) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'reduce',
      });
      await page.addInitScript((mode) => localStorage.setItem('fuzzs-quality', mode), quality);
      await page.goto('http://127.0.0.1:5173/');
      await page.locator('.supervisor-trigger').waitFor();
      if (!before) await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor();
      const info = await page.evaluate(async () => {
        const canvas = document.querySelector('canvas[aria-hidden="true"]');
        const url = performance
          .getEntriesByType('resource')
          .find(({ name }) => name.includes('/@react-three_fiber.js')).name;
        const { _roots } = await import(url);
        const { scene, gl, internal } = _roots.get(canvas).store.getState();
        const geometries = new Set(),
          materials = new Set(),
          textures = new Set(),
          shadowMaps = [],
          lights = {};
        let objects = 0,
          meshes = 0,
          instancedMeshes = 0,
          sprites = 0,
          points = 0,
          shadowCasters = 0;
        scene.traverse((object) => {
          objects++;
          if (object.isMesh) meshes++;
          if (object.isInstancedMesh) instancedMeshes++;
          if (object.isPoints) points++;
          if (object.isSprite) sprites++;
          if (object.isMesh && object.castShadow) shadowCasters++;
          if (object.geometry) geometries.add(object.geometry);
          if (object.material)
            for (const material of [object.material].flat()) materials.add(material);
          if (object.isLight) lights[object.type] = (lights[object.type] ?? 0) + 1;
          if (object.isLight && object.castShadow)
            shadowMaps.push({
              name: object.name || object.type,
              size: object.shadow.mapSize.toArray(),
            });
        });
        for (const material of materials) {
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          for (const { value } of Object.values(material.uniforms ?? {}))
            if (value?.isTexture) textures.add(value);
        }
        return {
          objects,
          meshes,
          instancedMeshes,
          sprites,
          points,
          shadowCasters,
          lights,
          shadowMaps,
          geometries: geometries.size,
          materials: materials.size,
          textures: textures.size,
          liveFrameSubscriptions: internal.subscribers.length,
          render: { ...gl.info.render },
          gpuResourceCounts: { ...gl.info.memory },
          programs: gl.info.programs?.length,
        };
      });
      result.inventory.push({ quality, ...info });
      console.log(JSON.stringify({ quality, ...info }));
      await page.close();
    }
  }

  if (!before && (stressOnly || process.argv.includes('--stress'))) {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 820 },
      reducedMotion: 'reduce',
    });
    await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'high'));
    await page.goto('http://127.0.0.1:5173/');
    await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor();
    const snapshot = () =>
      page.evaluate(async () => {
        const canvas = document.querySelector('canvas[aria-hidden="true"]');
        const url = performance
          .getEntriesByType('resource')
          .find(({ name }) => name.includes('/@react-three_fiber.js')).name;
        const { _roots } = await import(url);
        const { gl } = _roots.get(canvas).store.getState();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { ...gl.info.memory, programs: gl.info.programs.length };
      });
    const initial = await snapshot();
    const quality = page.locator('.factory-quality select');
    const cycles = [];
    for (let cycle = 0; cycle < (stressOnly ? 8 : 3); cycle++) {
      await quality.selectOption('low');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.production-canvas[data-quality="low"]').waitFor();
      await snapshot();
      await quality.selectOption('medium');
      await snapshot();
      await page.setViewportSize({ width: 1080, height: 820 });
      await quality.selectOption('high');
      await page.locator('.production-canvas[data-quality="high"]').waitFor();
      await page.waitForTimeout(500);
      cycles.push(await snapshot());
    }
    result.stress = { initial, cycles };
    console.log(JSON.stringify({ stress: result.stress }));
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
  await writeFile(`${directory}/measurements.json`, JSON.stringify(result, null, 2) + '\n');
}

if (result.samples.some(({ errors }) => errors.length)) process.exitCode = 1;
