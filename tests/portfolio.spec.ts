import { test, expect } from '@playwright/test';
import { readSupervisor } from '../scripts/supervisor-state.mjs';
test('desktop preferences, gaze, sticky core and keyboard portal', async ({ page }) => {
  test.setTimeout(65_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /Alternar Core|Switch Core/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-core', 'amber');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-core', 'amber');
  await expect(page.locator('.supervisor-trigger')).toBeVisible({ timeout: 20_000 });
  let pointerY = 235;
  await expect
    .poll(
      async () => {
        pointerY = pointerY === 235 ? 255 : 235;
        await page.mouse.move(1360, pointerY);
        return (await readSupervisor(page)).yaw;
      },
      { timeout: 16_000 },
    )
    .toBeGreaterThan(0.025);
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page
    .locator('#projects')
    .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(page.locator('.sticky-core')).toBeVisible();
  await expect(page.locator('.project-showcase')).toHaveCount(5);
  await page.locator('.project-details').first().click();
  await expect(page.locator('#details-fuzcontrol')).toBeVisible();
  const slider = page.getByRole('slider');
  await slider.focus();
  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await slider.press('End');
  await expect(slider).toHaveValue('100');
  expect(errors).toEqual([]);
});
test('mobile navigation, language persistence and no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.menu-button').click();
  await expect(page.locator('.navigation')).toBeVisible();
  await page.locator('.navigation a[href="#projects"]').click();
  await expect(page.locator('.navigation')).not.toBeVisible();
  await page.locator('.language-button').click();
  const language = await page.locator('html').getAttribute('lang');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', language!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
});
test('reduced motion and unavailable storage preserve usability', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('disabled');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.locator('.theme-button').click();
  await expect(page.locator('html')).toHaveAttribute('data-core', 'amber');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
});
test('layout fits narrow phones, tablets and ultrawide screens', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 768, 1024, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test('portal supports touch input', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5180');
  const slider = page.getByRole('slider');
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (!box) throw Error('Missing slider');
  await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2);
  expect(Number(await slider.inputValue())).toBeGreaterThan(65);
  await context.close();
});
