import { expect, test } from '@playwright/test';
import { readSupervisor } from '../scripts/supervisor-state.mjs';
import { BOOT_TIMEOUT_MS } from '../src/lib/factoryBoot';

test('the supervisor reacts and changes the aperture and shutter with its personality', async ({
  page,
}) => {
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', {
    timeout: BOOT_TIMEOUT_MS,
  });
  const core = page.getByTestId('hero-eye');
  const control = core.locator('.supervisor-trigger');
  await expect(control).toBeVisible();
  expect((await readSupervisor(page)).ceiling).toBe(true);
  const blue = await readSupervisor(page);
  await control.press('Enter');
  await expect(core.locator('.supervisor-speech')).not.toBeEmpty();

  const blink = readSupervisor(page, true);
  await page.locator('.theme-button').press('Enter');
  await expect(core).toHaveAttribute('data-personality', 'amber');
  expect((await blink).shutter).toBeLessThan(0.5);
  await expect
    .poll(async () => (await readSupervisor(page)).aperture, { timeout: 12_000 })
    .toBeLessThan(0.26);
  expect((await readSupervisor(page)).tint).not.toBe(blue.tint);
  await expect(core).toHaveAttribute('data-transitioning', 'false');
  await expect(core).toHaveAttribute('data-reaction', 'observing');
});

test('the supervisor tracks the cursor, returns to production and prefers the inspected project', async ({
  page,
}) => {
  test.setTimeout(50_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', {
    timeout: BOOT_TIMEOUT_MS,
  });
  await expect(page.locator('.supervisor-trigger')).toBeVisible();
  let pointerX = 1350;
  await expect
    .poll(
      async () => {
        await page.mouse.move(pointerX, 250);
        pointerX = pointerX === 1350 ? 1360 : 1350;
        return (await readSupervisor(page)).yaw;
      },
      { timeout: 12_000 },
    )
    .toBeGreaterThan(0.045);
  const following = await readSupervisor(page);
  await expect
    .poll(async () => (await readSupervisor(page)).yaw, { timeout: 12_000 })
    .toBeLessThan(0);
  const idle = await readSupervisor(page);
  expect(idle.wrist).not.toEqual(following.wrist);

  const project = page
    .locator('.factory-project-controls button')
    .filter({ hasText: 'FuzControl' });
  await project.press('Enter');
  await expect(page.locator('.factory-inspection h2')).toHaveText('FuzControl');
  await page.mouse.move(1350, 250);
  await expect
    .poll(async () => (await readSupervisor(page)).yaw, { timeout: 9_000 })
    .toBeLessThan(-0.1);
});

test('mobile portal text is readable at every boundary position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const copy = page.locator('.portal-perspectives');
  await expect(copy).toBeVisible();
  const slider = page.getByRole('slider');
  for (const key of ['Home', 'End', 'Home']) {
    await slider.focus();
    await slider.press(key);
    for (const panel of await copy.locator('article').all()) {
      await expect(panel.getByRole('heading')).toBeVisible();
      expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await panel.evaluate((el) => getComputedStyle(el).clipPath)).toBe('none');
    }
  }
  await page.screenshot({ path: 'artifacts/rework-mobile.png', fullPage: true });
});
test('reduced motion keeps core feedback without animated gaze', async ({ page }) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', {
    timeout: BOOT_TIMEOUT_MS,
  });
  const core = page.getByTestId('hero-eye');
  const control = core.locator('.supervisor-trigger');
  await expect(control).toBeVisible();
  const rest = await readSupervisor(page);
  await control.press('Enter');
  await expect(core.locator('.supervisor-speech')).not.toBeEmpty();
  await page.mouse.move(1300, 200);
  expect(await readSupervisor(page)).toEqual(rest);
  await expect(core).toHaveAttribute('data-reaction', 'observing');
});
