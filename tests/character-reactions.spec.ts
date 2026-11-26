import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readSupervisor } from '../scripts/supervisor-state.mjs';

async function readTurret(page: Page, variant: 'active' | 'sleeping' = 'sleeping') {
  return page.evaluate(async (variant) => {
    const canvas = document.querySelector<HTMLCanvasElement>('.production-canvas canvas')!;
    const resource = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js'))!;
    const { _roots } = await import(resource.name);
    const { camera, scene } = _roots.get(canvas).store.getState();
    const model = scene.getObjectByName(`factory-turret-${variant}`);
    const head = model.getObjectByName(`turret-head-${variant}`);
    const lens = model.getObjectByName(`turret-lens-${variant}`);
    const sparks = model.getObjectByName(`turret-sparks-${variant}`);
    const point = lens.getWorldPosition(camera.position.clone()).project(camera);
    const box = canvas.getBoundingClientRect();
    return {
      x: box.left + ((1 + point.x) * box.width) / 2,
      y: box.top + ((1 - point.y) * box.height) / 2,
      energy: lens.material.emissiveIntensity as number,
      roll: head.rotation.z as number,
      sparks: sparks.visible as boolean,
    };
  }, variant);
}

async function start(page: Page) {
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
}

test('the supervisor acknowledges a click, lifts the wrist on repetition and returns to BLUE', async ({
  page,
}) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-quality', 'low');
    localStorage.setItem('fuzzs-core', 'blue');
  });
  await start(page);
  const core = page.getByTestId('hero-eye');
  const trigger = core.getByRole('button');
  const initial = await readSupervisor(page);
  await trigger.evaluate((button: HTMLButtonElement) => button.click());
  await expect(core).toHaveAttribute('data-reaction', 'delighted');
  await trigger.evaluate((button: HTMLButtonElement) => {
    for (let index = 0; index < 4; index++) button.click();
  });
  await expect(core).toHaveAttribute('data-reaction', 'annoyed');
  await expect
    .poll(async () => (await readSupervisor(page)).wrist[1])
    .toBeGreaterThan(initial.wrist[1] + 0.11);
  await expect
    .poll(async () => {
      const { tint } = await readSupervisor(page);
      return Number.parseInt(tint.slice(0, 2), 16) - Number.parseInt(tint.slice(4), 16);
    })
    .toBeGreaterThan(25);
  await expect(core).toHaveAttribute('data-reaction', 'observing');
  await expect(core).toHaveAttribute('data-personality', 'blue');
  await expect.poll(async () => (await readSupervisor(page)).wrist[1]).toBeLessThan(7.67);
  await expect
    .poll(async () => {
      const { tint } = await readSupervisor(page);
      return Number.parseInt(tint.slice(4), 16) - Number.parseInt(tint.slice(0, 2), 16);
    })
    .toBeGreaterThan(25);
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'false');
});

test('a physical turret click escalates into a local failure and recovery', async ({ page }) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'low'));
  await start(page);
  const point = await readTurret(page, 'active');
  expect(point.energy).toBe(1.55);
  for (let index = 0; index < 5; index++) await page.mouse.click(point.x, point.y);
  await expect.poll(async () => (await readTurret(page, 'active')).roll).toBeLessThan(-0.15);
  await expect.poll(async () => (await readTurret(page, 'active')).energy).toBe(1.55);
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.factory-inspection')).toHaveCount(0);
  await page.locator('.factory-project-controls button').nth(2).press('Enter');
  await expect(page.locator('.factory-inspection h2')).toHaveText('Fuzz Deck');
});

test.describe('touch and reduced motion', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });

  test('a tap lights the sleeping turret briefly without movement or sparks', async ({ page }) => {
    test.setTimeout(45_000);
    await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'medium'));
    await start(page);
    const point = await readTurret(page);
    await page.touchscreen.tap(point.x, point.y);
    await expect.poll(async () => (await readTurret(page)).energy).toBeGreaterThan(0);
    expect(await readTurret(page)).toMatchObject({ roll: 0, sparks: false });
    await expect.poll(async () => (await readTurret(page)).energy).toBe(0);
    await expect(page.locator('.factory-inspection')).toHaveCount(0);
  });
});
