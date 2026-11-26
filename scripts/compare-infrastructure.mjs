import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { preview } from 'vite';

const phase = process.argv[2] ?? 'after';
const directory = `artifacts/infrastructure/${phase}`;
await mkdir(directory, { recursive: true });
const server = await preview({
  build: { outDir: process.argv[3] ?? 'dist' },
  preview: { host: '127.0.0.1', port: 5181, strictPort: true },
});
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const measurements = [];

try {
  for (const [name, width, height, color, reducedMotion, zoom] of [
    ['desktop', 1440, 1000, 'blue', 'reduce', 1],
    ['ultrawide', 2560, 1080, 'blue', 'reduce', 1],
    ['notebook', 1280, 800, 'amber', 'reduce', 1],
    ['zoom-out', 1440, 1000, 'amber', 'reduce', 0.8],
    ['zoom-in', 1440, 1000, 'blue', 'reduce', 1.25],
    ['mobile', 390, 844, 'blue', 'reduce', 1],
    ['running', 1440, 1000, 'blue', 'no-preference', 1],
  ]) {
    const page = await browser.newPage({
      viewport: { width: Math.round(width / zoom), height: Math.round(height / zoom) },
      deviceScaleFactor: zoom,
      reducedMotion,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript((theme) => {
      localStorage.setItem('fuzzs-core', theme);
      localStorage.setItem('fuzzs-locale', 'pt');
      window.draws = 0;
      for (const name of [
        'drawArrays',
        'drawElements',
        'drawArraysInstanced',
        'drawElementsInstanced',
      ]) {
        const prototype = WebGL2RenderingContext.prototype;
        const draw = prototype[name];
        prototype[name] = function (...args) {
          window.draws++;
          return draw.apply(this, args);
        };
      }
    }, color);
    await page.goto('http://127.0.0.1:5181');
    await page.locator('canvas').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.draws > 0);
    await page.waitForFunction(() => {
      const stage = document.querySelector('#home')?.getAttribute('data-boot');
      return !stage || stage === 'running';
    });
    if (name === 'running') {
      await page.waitForTimeout(2600);
      measurements.push(
        await page.evaluate(async () => {
          let time = await new Promise(requestAnimationFrame);
          const first = window.draws;
          const start = time;
          let frames = 0;
          while (time - start < 4200) {
            time = await new Promise(requestAnimationFrame);
            frames++;
          }
          const canvas = document.querySelector('canvas');
          const gl = canvas.getContext('webgl2');
          const extension = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            frames,
            milliseconds: time - start,
            framesPerSecond: (frames * 1000) / (time - start),
            drawCallsPerFrame: (window.draws - first) / frames,
            canvas: [canvas.width, canvas.height],
            renderer: gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
          };
        }),
      );
    }
    await page.screenshot({ path: `${directory}/${name}.png` });
    if (
      process.argv.includes('--inspection') &&
      ['desktop', 'ultrawide', 'notebook', 'mobile'].includes(name)
    ) {
      await page
        .locator('.factory-project-controls button')
        .filter({ hasText: 'Fuzz Deck' })
        .click();
      await page.locator('.factory-inspection h2').filter({ hasText: 'Fuzz Deck' }).waitFor();
      await page.screenshot({ path: `${directory}/${name}-inspection.png` });
    }
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    measurements.push({ name, width, height, color, zoom, horizontalOverflow, errors });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

await writeFile(`${directory}/measurements.json`, JSON.stringify(measurements, null, 2));
console.log(JSON.stringify(measurements));
if (measurements.some(({ errors, horizontalOverflow }) => errors?.length || horizontalOverflow))
  process.exitCode = 1;
