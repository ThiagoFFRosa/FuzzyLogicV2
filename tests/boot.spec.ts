import { expect, test } from '@playwright/test';
import { BOOT_TIMEOUT_MS } from '../src/lib/factoryBoot';

test('a delayed infrastructure chunk keeps the factory covered and projects available', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-core', 'amber');
    localStorage.setItem('fuzzs-locale', 'pt');
    localStorage.setItem('fuzzs-quality', 'medium');
  });
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/BackgroundInfrastructure.tsx*', async (route) => {
    await delayed;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const boot = page.locator('.facility-boot');
    await expect(boot).toHaveAttribute('data-personality', 'amber');
    await expect(boot).toHaveAttribute('data-stage', 'scene', { timeout: 20_000 });
    await expect(boot.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '54');
    await expect(page.locator('.factory-render')).toHaveCSS('opacity', '0');
    await expect(page.locator('.supervisor-trigger')).toHaveCount(0);
    expect(await page.evaluate(() => window.__fuzzsAmbient?.snapshot())).toMatchObject({
      enabled: false,
      time: 0,
    });
    await page.screenshot({ path: 'artifacts/boot/desktop-amber.png' });
    await page.locator('.factory-project-controls button').first().press('Enter');
    await expect(page.locator('.factory-inspection')).toHaveAttribute('data-origin', 'control');
    await expect(page.locator('.factory-inspection h2')).toHaveText('FuzControl');
    await page.keyboard.press('Escape');
    await expect(page.locator('.factory-inspection')).toHaveCount(0);

    release();
    await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', {
      timeout: 32_000,
    });
    await expect(boot).toHaveCount(0);
    await expect(page.locator('.factory-render')).toHaveCSS('opacity', '1');
    await expect(page.locator('.production-canvas')).toHaveAttribute('data-scenery-ready', 'true');
  } finally {
    release();
  }
});

test('a failed asset offers retry and a new navigation can finish boot', async ({ page }) => {
  test.setTimeout(55_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const module = '**/BackgroundInfrastructure.tsx*';
  await page.route(module, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.facility-boot')).toHaveAttribute('data-stage', 'error');
  await expect(page.locator('.facility-boot').getByRole('alert')).toContainText(
    /resources failed|recursos.*carregaram/,
  );
  await page.unroute(module);
  await page.locator('.factory-retry-3d').click();
  const hero = page.locator('#home');
  await expect(hero).toHaveAttribute('data-boot', 'running', { timeout: 24_000 });
  await expect(page.locator('.production-canvas')).toHaveAttribute('data-quality', 'low');
  await page.reload();
  await expect(hero).toHaveAttribute('data-boot', 'running', { timeout: 24_000 });
  await expect(page.locator('.supervisor-trigger')).toBeVisible();
});

test('startup timeout still offers projects and a persistent 2D mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((limit) => {
    localStorage.setItem('fuzzs-locale', 'en');
    const original = window.setTimeout;
    window.setTimeout = (handler, delay, ...args) =>
      original(handler, delay === limit ? 1200 : delay, ...args);
  }, BOOT_TIMEOUT_MS);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/FactoryScene.tsx*', async (route) => {
    await delayed;
    await route.abort();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.facility-boot')).toHaveAttribute('data-personality', 'blue');
    await expect(page.locator('.facility-boot').getByRole('alert')).toHaveText(
      /Startup took longer/,
    );
    await expect(page.getByRole('link', { name: 'Go to projects' })).toHaveAttribute(
      'href',
      '#projects',
    );
    await page.getByRole('button', { name: 'Use 2D view' }).press('Enter');
    await expect(page.locator('#home')).toHaveAttribute('data-boot', 'off');
    await expect(page.getByTestId('hero-eye')).toHaveClass(/robotic-core/);
    await expect(page.locator('.factory-project-controls button')).toHaveCount(5);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#home')).toHaveAttribute('data-boot', 'off');
    await expect(page.locator('.production-canvas')).toHaveCount(0);
  } finally {
    release();
  }
});
