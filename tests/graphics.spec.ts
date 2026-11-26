import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Object3D, SpotLight } from 'three';

async function readBuffer(page: Page) {
  return page.locator('.production-canvas canvas').evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext('webgl2')!;
    const area = element.getBoundingClientRect();
    return {
      area: [area.width, area.height],
      buffer: [context.drawingBufferWidth, context.drawingBufferHeight],
      device: devicePixelRatio,
      nativeAA: context.getContextAttributes()?.antialias,
      samples: context.getParameter(context.SAMPLES) as number,
      error: context.getError(),
    };
  });
}

test.describe('independent graphics settings', () => {
  test.use({ deviceScaleFactor: 1.25, viewport: { width: 1280, height: 900 } });

  test('fixed presets use physical scale and native AA while keeping the canvas and inspection', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      if (localStorage.getItem('fuzzs-quality') === null)
        localStorage.setItem('fuzzs-quality', 'high');
      localStorage.setItem('fuzzs-locale', 'en');
    });
    await page.goto('/');
    const quality = page.locator('.factory-quality select');
    const canvas = page.locator('.production-canvas');
    await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', {
      timeout: 35_000,
    });
    await page.locator('.factory-project-controls button').nth(2).press('Enter');
    const project = page.locator('.factory-inspection h2');
    await expect(project).toHaveText('Fuzz Deck');
    await canvas.locator('canvas').evaluate((element: HTMLCanvasElement) => {
      element.dataset.presetProbe = 'mounted';
    });
    const assertScale = async (factor: number) => {
      await expect
        .poll(
          async () => {
            const { area, buffer, device } = await readBuffer(page);
            return Math.max(
              ...area.map((size, index) =>
                Math.abs(buffer[index] - Math.floor(size * device * factor)),
              ),
            );
          },
          { timeout: 25_000 },
        )
        .toBeLessThanOrEqual(1);
    };
    for (const [preset, factor] of [
      ['low', 0.5],
      ['medium', 0.75],
      ['high', 1],
      ['ultra', 1.25],
    ] as const) {
      await quality.selectOption(preset);
      await expect(canvas).toHaveAttribute('data-quality', preset);
      await assertScale(factor);
      const { nativeAA, samples } = await readBuffer(page);
      await expect(canvas).toHaveAttribute('data-antialias', samples > 1 ? 'msaa' : 'fxaa');
      if (samples > 1) expect(nativeAA).toBe(true);
      await expect(canvas.locator('canvas')).toHaveAttribute('data-preset-probe', 'mounted');
    }
    await expect(canvas).toHaveAttribute('data-dynamic-resolution', 'false', { timeout: 25_000 });
    await expect(project).toHaveText('Fuzz Deck');

    await page.getByRole('button', { name: 'Graphics settings', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Rendering' });
    await expect(panel).toBeVisible();
    await panel.getByLabel('Show diagnostics').check();
    await expect(panel.getByText('Allocated textures', { exact: true })).toBeVisible();
    await panel.getByLabel('Post-processing').selectOption('bloom');
    await expect(canvas).toHaveAttribute('data-postprocessing', 'bloom');
    expect((await readBuffer(page)).error).toBe(0);
    await expect(panel.getByLabel('Antialiasing')).toHaveCount(0);
    await expect(panel.getByLabel('Shadows')).toHaveCount(0);
    await expect(panel.getByLabel('Textures')).toHaveCount(0);
    await expect(panel.locator('dt:text-is("Shadows") + dd')).toHaveText('HIGH');
    await expect(panel.getByText('Standard', { exact: true })).toBeVisible();
    for (const [option, factor] of [
      ['50', 0.5],
      ['125', 1.25],
    ] as const) {
      await panel.getByLabel('Render scale').selectOption(option);
      await assertScale(factor);
    }
    await expect(panel.getByText('ULTRA · CUSTOM')).toBeVisible();
    await expect(project).toHaveText('Fuzz Deck');
    await page.setViewportSize({ width: 1130, height: 850 });
    await assertScale(1.25);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1060,
      height: 820,
      deviceScaleFactor: 1.5,
      mobile: false,
    });
    await expect.poll(async () => (await readBuffer(page)).device).toBe(1.5);
    await assertScale(1.25);
    await page.locator('.theme-button').press('Enter');
    await expect(page.getByTestId('hero-eye')).toHaveAttribute('data-personality', 'amber');
    await panel.getByRole('button', { name: 'Restore defaults' }).click();
    await assertScale(1.25);
    await expect(canvas).toHaveAttribute('data-postprocessing', 'off');
    await expect(project).toHaveText('Fuzz Deck');

    await panel.getByLabel('Render scale').selectOption('75');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const stored = JSON.parse(localStorage.getItem('fuzzs-render-settings-v1') ?? '{}');
          return stored.ultra?.scale;
        }),
      )
      .toBe(75);
    await page.reload();
    await expect(canvas).toHaveAttribute('data-quality', 'ultra', { timeout: 35_000 });
    await assertScale(0.75);
    await expect(page.getByRole('region', { name: 'Rendering' })).toHaveCount(0);
  });
});

test('migrates legacy options and reports the MSAA fallback and hardware limits', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 820, height: 760 });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-quality', 'ultra');
    localStorage.setItem('fuzzs-locale', 'en');
    localStorage.setItem(
      'fuzzs-render-settings-v1',
      JSON.stringify({
        ultra: { scale: 150, aa: 'off', shadows: 'off', fps: 30 },
      }),
    );
    const read = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (name) {
      if (name === this.MAX_VIEWPORT_DIMS) return new Int32Array([960, 960]);
      if (name === this.SAMPLES) return 0;
      return read.call(this, name);
    };
  });
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  await page.getByRole('button', { name: 'Graphics settings', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Rendering' });
  await expect(panel.getByRole('status')).toContainText('device dimensions limit');
  await expect(panel.getByRole('status')).toContainText('did not provide MSAA');
  await expect(page.locator('.production-canvas')).toHaveAttribute('data-antialias', 'fxaa');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('fuzzs-render-settings-v1') ?? '{}').ultra,
    ),
  ).toEqual({ fps: 30 });
  const { buffer } = await readBuffer(page);
  expect(Math.max(...buffer)).toBeLessThanOrEqual(960);
  await panel.getByLabel('Show diagnostics').check();
  const measured = await page.evaluate(async () => {
    const canvas = document.querySelector('.production-canvas canvas');
    const source = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js'));
    if (!canvas || !source) throw new Error('Missing frame store.');
    const { _roots } = await import(source.name);
    const { gl, scene } = _roots.get(canvas).store.getState();
    if (!gl.shadowMap.enabled) throw new Error('HIGH shadow maps must remain enabled.');
    let mainMaps = 0;
    scene.traverse((object: Object3D) => {
      const light = object as SpotLight;
      if (light.isSpotLight && light.castShadow && light.shadow.mapSize.x === 1024) mainMaps++;
    });
    if (mainMaps < 2) throw new Error('Expected two HIGH shadow maps.');
    const frames: number[] = [];
    const previous = scene.onAfterRender;
    scene.onAfterRender = () => {
      frames.push(performance.now());
    };
    try {
      const start = performance.now();
      while (
        performance.now() - start < 1200 ||
        (frames.length < 4 && performance.now() - start < 8000)
      )
        await new Promise(requestAnimationFrame);
      return ((frames.length - 1) * 1000) / ((frames.at(-1) ?? 0) - frames[0]);
    } finally {
      scene.onAfterRender = previous;
    }
  });
  expect(measured).toBeGreaterThan(0);
  expect(measured).toBeLessThan(32);
});
