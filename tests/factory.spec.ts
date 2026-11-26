import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { productionCamera } from '../src/lib/factoryCamera';
import { readSupervisor } from '../scripts/supervisor-state.mjs';
test('production line exposes real projects and unfolds inspection without a dialog', async ({
  page,
}) => {
  test.setTimeout(50_000);
  await page.goto('/');
  await expect(page.locator('.factory-project-controls button')).toHaveCount(5);
  await page.locator('.factory-project-controls button').filter({ hasText: 'FuzControl' }).click();
  await expect(page.locator('.factory-inspection')).toBeVisible();
  await expect(page.locator('.factory-inspection h2')).toHaveText('FuzControl');
  await expect(page.locator('.factory-inspection a')).toHaveAttribute(
    'href',
    'https://fuzcontrol.com',
  );
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(page.locator('#home')).toHaveAttribute('data-inspecting', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#home')).toHaveAttribute('data-inspecting', 'false');
  await expect(page.locator('.factory-inspection')).toHaveCount(0, { timeout: 12_000 });
  await expect(
    page.locator('.factory-project-controls button').filter({ hasText: 'FuzControl' }),
  ).toBeFocused();
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.factory-pause').click();
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'true');
});
test('a physical crate can be picked directly on the canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.supervisor-trigger')).toBeVisible({ timeout: 20_000 });
  const bounds = await page.locator('.factory-scene').boundingBox();
  if (!bounds) throw Error('Missing scene');
  const aspect = bounds.width / bounds.height;
  const config = productionCamera(aspect, false, 'desktop').camera;
  const camera = new PerspectiveCamera(config.fov, aspect, config.near, config.far);
  camera.position.set(...config.position);
  camera.lookAt(...config.target);
  camera.updateMatrixWorld();
  const projected = new Vector3(0, 2, 1.13).project(camera);
  await page.mouse.click(
    bounds.x + ((projected.x + 1) * bounds.width) / 2,
    bounds.y + ((1 - projected.y) * bounds.height) / 2,
  );
  await expect(page.locator('.factory-inspection h2')).toHaveText('Fuzz Deck');
  await expect(page.locator('.factory-inspection')).toHaveAttribute('data-origin', 'crate');
  await expect(page.locator('.factory-tether path')).toHaveAttribute('d', /^M /);
});
test('mobile and reduced motion retain every project and readable inspection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const project of ['FuzControl', 'SeuValet', 'Fuzz Deck', 'MineWardrobe', 'TG Neonatal']) {
    await page.locator('.factory-project-controls button').filter({ hasText: project }).click();
    await expect(page.locator('.factory-inspection h2')).toHaveText(project);
    await expect(page.locator('.factory-inspection')).toBeInViewport();
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('direct access avoids seeking and rapid selection preserves the manual pause', async ({
  page,
}) => {
  test.setTimeout(95_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.supervisor-trigger')).toBeVisible({ timeout: 20_000 });
  await page.locator('.factory-pause').click();
  const start = await readSupervisor(page);
  await expect
    .poll(async () => (await readSupervisor(page)).fluidTravel, { timeout: 18_000 })
    .toBeGreaterThan(start.fluidTravel + 0.95);
  const stopped = await readSupervisor(page);
  const bar = page.locator('.factory-project-controls button');
  await bar.filter({ hasText: 'TG Neonatal' }).click();
  await expect(page.locator('.factory-inspection')).toHaveAttribute('data-origin', 'control');
  const projectName = 'Fuzz Deck';
  const physical = bar.filter({ hasText: projectName });
  await page.locator('.factory-project-controls').evaluate((navigation) => {
    const buttons = navigation.querySelectorAll('button');
    buttons[1].click();
    buttons[2].click();
    buttons[2].click();
  });
  const panel = page.locator('.factory-inspection');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('h2')).toHaveText(projectName);
  await expect(panel).toHaveAttribute('data-origin', 'crate');
  await page.locator('.theme-button').press('Enter');
  await expect(page.getByTestId('hero-eye')).toHaveAttribute('data-personality', 'amber');
  await page.locator('.language-button').press('Enter');
  await expect(panel.locator('h2')).toHaveText(projectName);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel.locator('h2')).toHaveText(projectName);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect((await readSupervisor(page)).crateX).toBe(stopped.crateX);
  await panel.getByRole('button', { name: /Fechar inspeção|Close inspection/ }).click();
  await expect(physical).toBeFocused();
  await expect(panel).toHaveCount(0, { timeout: 12_000 });
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'true');
  expect((await readSupervisor(page)).crateX).toBe(stopped.crateX);
});
test('project inspection remains available without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (type: string, ...args: unknown[]) {
        if (type.includes('webgl')) return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.factory-fallback, .factory-no-webgl').first()).toBeVisible();
  await expect(page.getByTestId('hero-eye')).toHaveClass(/robotic-core/);
  await page.locator('.factory-project-controls button').filter({ hasText: 'SeuValet' }).click();
  await expect(page.locator('.factory-inspection h2')).toHaveText('SeuValet');
  await expect(page.locator('.factory-inspection')).toHaveAttribute('data-origin', 'control');
});
