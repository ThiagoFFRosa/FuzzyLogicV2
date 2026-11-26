import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function readBuffer(page: Page) {
  return page.locator('.production-canvas canvas').evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext('webgl2')!;
    const area = element.getBoundingClientRect();
    return {
      area: [area.width, area.height],
      buffer: [context.drawingBufferWidth, context.drawingBufferHeight],
      device: devicePixelRatio,
      error: context.getError(),
    };
  });
}

test.describe('independent graphics settings', () => {
  test.use({ deviceScaleFactor: 1.25, viewport: { width: 1280, height: 900 } });

  test('ULTRA follows the physical canvas and keeps inspection across manual changes', async ({
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
    await quality.selectOption('ultra');
    await expect(canvas).toHaveAttribute('data-quality', 'ultra');
    await expect(canvas).toHaveAttribute('data-dynamic-resolution', 'false', { timeout: 25_000 });
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
    await assertScale(1);
    await expect(canvas).toHaveAttribute('data-antialias', /^(msaa|fxaa)$/);
    await expect(project).toHaveText('Fuzz Deck');

    await page.getByRole('button', { name: 'Graphics settings', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Rendering' });
    await expect(panel).toBeVisible();
    await panel.getByLabel('Show diagnostics').check();
    await expect(panel.getByText('Allocated textures', { exact: true })).toBeVisible();
    await panel.getByLabel('Post-processing').selectOption('bloom');
    await expect(canvas).toHaveAttribute('data-postprocessing', 'bloom');
    expect((await readBuffer(page)).error).toBe(0);
    await panel.getByLabel('Antialiasing').selectOption('fxaa');
    await expect(canvas).toHaveAttribute('data-antialias', 'fxaa', { timeout: 25_000 });
    await expect(canvas).toHaveAttribute('data-postprocessing', 'bloom');
    expect((await readBuffer(page)).error).toBe(0);
    for (const [option, factor] of [
      ['50', 0.5],
      ['125', 1.25],
    ] as const) {
      await panel.getByLabel('Render scale').selectOption(option);
      await assertScale(factor);
    }
    await panel.getByLabel('Shadows').selectOption('off');
    await panel.getByLabel('Textures').selectOption('standard');
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
    await assertScale(1);
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

test('reports reduced hardware dimensions and caps actual frame submissions', async ({ page }) => {
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
      return read.call(this, name);
    };
  });
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  await page.getByRole('button', { name: 'Graphics settings', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Rendering' });
  await expect(panel.getByRole('status')).toContainText('device dimensions limit');
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
    const { scene } = _roots.get(canvas).store.getState();
    const frames: number[] = [];
    const previous = scene.onAfterRender;
    scene.onAfterRender = () => {
      frames.push(performance.now());
    };
    try {
      const start = performance.now();
      while (performance.now() - start < 1200) await new Promise(requestAnimationFrame);
      return ((frames.length - 1) * 1000) / ((frames.at(-1) ?? 0) - frames[0]);
    } finally {
      scene.onAfterRender = previous;
    }
  });
  expect(measured).toBeGreaterThan(0);
  expect(measured).toBeLessThan(32);
});
