import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { preview } from 'vite';

const name = process.argv[2] ?? 'part-14-after';
const directory = `artifacts/infrastructure/${name}`;
const performanceOnly = process.argv.includes('--performance-only');
await mkdir(directory, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 5181, strictPort: true } });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const rows = [];

try {
  const sizes = performanceOnly
    ? [
        [390, 844],
        [844, 390],
      ]
    : [
        [320, 568],
        [360, 800],
        [390, 844],
        [430, 932],
        [768, 1024],
        [844, 390],
      ];
  for (const [width, height] of sizes) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
      reducedMotion: performanceOnly ? 'no-preference' : 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    if (performanceOnly) {
      await page.addInitScript(() => {
        window.draws = 0;
        for (const name of [
          'drawElements',
          'drawArrays',
          'drawElementsInstanced',
          'drawArraysInstanced',
        ]) {
          const original = WebGL2RenderingContext.prototype[name];
          WebGL2RenderingContext.prototype[name] = function (...args) {
            window.draws++;
            return original.apply(this, args);
          };
        }
      });
    }
    await page.goto('http://127.0.0.1:5181/');
    await page.locator('#home[data-boot="running"]').waitFor({ timeout: 36_000 });
    const layout = await page.evaluate(() => {
      const bounds = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? [box.x, box.y, box.width, box.height] : null;
      };
      const canvas = document.querySelector('canvas');
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        quality: document.querySelector('.production-canvas')?.dataset.quality,
        scene: bounds('.factory-scene'),
        project: bounds('.factory-project-controls button'),
        core: bounds('.factory-core'),
        menu: bounds('.menu-button'),
        canvas: [canvas.width, canvas.height],
      };
    });
    if (!performanceOnly) {
      await page.screenshot({ path: `${directory}/${width}x${height}.png` });
      await page.locator('.factory-project-controls button').nth(2).tap();
      await page.locator('.factory-inspection').waitFor();
      if ([320, 390, 844].includes(width))
        await page.screenshot({ path: `${directory}/${width}x${height}-inspection.png` });
      if (width === 390) {
        await page.locator('.inspection-rail button').tap();
        for (const [label, selector] of [
          ['projects', '#projects'],
          ['portal', '.portal-perspectives'],
          ['about', '#about'],
          ['contact', '#contact'],
        ]) {
          await page
            .locator(selector)
            .evaluate((section) =>
              section.scrollIntoView({ block: 'center', behavior: 'instant' }),
            );
          await page.screenshot({ path: `${directory}/mobile-${label}.png` });
        }
      }
      rows.push({ width, height, ...layout, errors });
    } else {
      if (width > height) {
        // Show the scene in the old and new compositions while measuring landscape.
        await page
          .locator('.factory-scene')
          .evaluate((scene) => scene.scrollIntoView({ block: 'start' }));
      }
      const sample = await page.evaluate(async () => {
        const next = () => new Promise(requestAnimationFrame);
        const start = await next();
        const first = window.draws;
        let last = start;
        const frames = [];
        while (last - start < 3800) {
          const frame = await next();
          frames.push(frame - last);
          last = frame;
        }
        frames.sort((a, b) => a - b);
        const gl = document.querySelector('canvas').getContext('webgl2');
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          effective: document.querySelector('.production-canvas').dataset.quality,
          fps: (frames.length * 1000) / (last - start),
          frames: frames.length,
          p50Ms: frames[Math.ceil(frames.length / 2) - 1],
          p95Ms: frames[Math.ceil(frames.length * 0.95) - 1],
          drawsPerFrame: (window.draws - first) / frames.length,
          renderer: gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
        };
      });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      const { metrics } = await cdp.send('Performance.getMetrics');
      const heapBytes = metrics.find(({ name }) => name === 'JSHeapUsedSize')?.value;
      rows.push({ width, height, ...layout, ...sample, heapBytes, errors });
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
  await writeFile(`${directory}/measurements.json`, JSON.stringify(rows, null, 2) + '\n');
}
console.log(JSON.stringify(rows));
if (rows.some(({ overflow, errors }) => overflow || errors.length)) process.exitCode = 1;
