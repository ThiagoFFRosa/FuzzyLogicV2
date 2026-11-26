import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function rendererState(page: Page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-hidden="true"]')!;
    const url = performance
      .getEntriesByType('resource')
      .find(({ name }) => name.includes('/@react-three_fiber.js'))!.name;
    const { _roots } = await import(url);
    const { gl, scene, frameloop } = _roots.get(canvas).store.getState();
    return {
      width: canvas.width,
      frame: gl.info.render.frame,
      frameloop,
      shadows: gl.shadowMap.enabled,
      crateX: scene.getObjectByName('project-crate-2').position.x,
    };
  });
}

test('the project HTML and inspection work before loading the 3D scene', async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/FactoryScene.tsx*', async (route) => {
    await blocked;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.factory-project-controls button')).toHaveCount(5);
    await page.locator('.factory-project-controls button').first().press('Enter');
    await expect(page.locator('.factory-inspection h2')).toHaveText('FuzControl');
    await expect(page.locator('canvas[aria-hidden="true"]')).toHaveCount(0);
  } finally {
    release();
  }
});

test('quality changes live with inspection open, persists, and provides an explicit 2D mode', async ({
  page,
}) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const quality = page.locator('.factory-quality select');
  const canvas = page.locator('.production-canvas');
  await expect(quality).toHaveValue('auto');
  await expect(canvas).toHaveAttribute('data-quality', 'medium');
  await expect(canvas).toHaveAttribute('data-scenery-ready', 'true', { timeout: 20_000 });
  const before = await rendererState(page);
  await page.locator('.factory-project-controls button').nth(2).press('Enter');
  const project = page.locator('.factory-inspection h2');
  await expect(project).toHaveText('Fuzz Deck');

  await quality.selectOption('low');
  await expect(canvas).toHaveAttribute('data-quality', 'low');
  await expect.poll(async () => (await rendererState(page)).width).toBeLessThan(before.width);
  expect((await rendererState(page)).shadows).toBe(true);
  for (const level of ['high', 'medium', 'high']) {
    await quality.selectOption(level);
    await expect(canvas).toHaveAttribute('data-quality', level);
    await expect(project).toHaveText('Fuzz Deck');
    expect((await rendererState(page)).crateX).toBe(before.crateX);
  }
  await quality.selectOption('off');
  await expect(canvas).toHaveCount(0);
  await expect(project).toHaveText('Fuzz Deck');
  await page.reload();
  await expect(quality).toHaveValue('off');
  await expect(page.locator('.factory-fallback')).toBeVisible();
  await expect(canvas).toHaveCount(0);
  await quality.selectOption('auto');
  await expect(canvas).toHaveAttribute('data-quality', 'medium', { timeout: 20_000 });
});

test('context loss preserves the project panel and offers a fresh renderer', async ({ page }) => {
  test.setTimeout(65_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const canvas = page.locator('canvas[aria-hidden="true"]');
  await canvas.waitFor();
  await page.locator('.factory-project-controls button').first().press('Enter');
  const supported = await canvas.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext('webgl2');
    const loss = context?.getExtension('WEBGL_lose_context');
    loss?.loseContext();
    return Boolean(loss);
  });
  test.skip(!supported, 'Chromium did not expose WEBGL_lose_context.');
  await expect(page.locator('.factory-fallback')).toBeVisible();
  await expect(page.locator('.factory-inspection h2')).toHaveText('FuzControl');
  await page.locator('.factory-retry-3d').click();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.factory-inspection h2')).toHaveText('FuzControl');
});

test('scroll and tab visibility suspend the render loop while holding the main belt position', async ({
  page,
}) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 850, height: 760 });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'low'));
  await page.goto('/');
  await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor();
  const suspend = async () => {
    await expect.poll(async () => (await rendererState(page)).frameloop).toBe('demand');
    const idle = await rendererState(page);
    await page.waitForTimeout(750);
    const later = await rendererState(page);
    expect(later.frame - idle.frame).toBeLessThan(5);
    expect(later.crateX).toBe(idle.crateX);
  };
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
  );
  await suspend();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(async () => (await rendererState(page)).frameloop).toBe('always');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await suspend();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await rendererState(page)).frameloop).toBe('always');
});
