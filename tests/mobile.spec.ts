import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});

test('mobile navigation exposes accessible settings and persists the motion preference', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-quality', 'off');
    localStorage.setItem('fuzzs-locale', 'pt');
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const header = page.locator('.site-header');
  const menu = page.locator('.menu-button');
  await expect(header).toHaveAttribute('data-compact', 'true');
  for (const selector of ['.menu-button', '.theme-button', '.language-button']) {
    const rect = await page.locator(selector).boundingBox();
    expect(rect?.width, selector).toBeGreaterThanOrEqual(44);
    expect(rect?.height, selector).toBeGreaterThanOrEqual(44);
  }
  await menu.tap();
  await expect(page.locator('.mobile-settings').getByRole('link')).toHaveAttribute(
    'href',
    '#factory-settings',
  );
  const motion = page.getByRole('combobox', { name: 'Movimento', exact: true });
  await motion.selectOption('reduced');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await motion.focus();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await menu.tap();
  await expect(motion).toHaveValue('reduced');
  await motion.selectOption('auto');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
});

test('the floating core leaves the landscape footer and GitHub target accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'off'));
  await page.goto('/');
  await page
    .locator('#projects')
    .evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(page.locator('.sticky-core')).toBeVisible();
  await page.evaluate(() =>
    scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
  );
  const github = page.locator('footer').getByRole('link', { name: 'GitHub' });
  await expect(page.locator('.sticky-core')).toHaveCount(0);
  await expect(github).toBeInViewport();
  expect((await github.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(
    await github.evaluate((link) => {
      const b = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2));
    }),
  ).toBe(true);
});

test('touch opens every project in the compact layout and closing restores the trigger', async ({
  page,
}) => {
  test.setTimeout(50_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fuzzs-locale', 'en'));
  await page.goto('/');
  const buttons = page.locator('.factory-project-controls button');
  for (const [index, name] of [
    'FuzControl',
    'SeuValet',
    'Fuzz Deck',
    'MineWardrobe',
    'TG Neonatal',
  ].entries()) {
    const trigger = buttons.nth(index);
    await trigger.tap();
    await expect(page.locator('.factory-inspection h2')).toHaveText(name);
    const close = page.getByRole('button', { name: 'Close inspection' });
    await expect(close).toBeInViewport();
    await close.tap();
    await expect(trigger).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('rotation retains the canvas, manual pause and inspection with a compact landscape camera', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  const hero = page.locator('#home');
  await expect(hero).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  await page.locator('.factory-pause').tap();
  await page.locator('.production-canvas canvas').evaluate((element) => {
    (element as HTMLCanvasElement).dataset.rotationProbe = 'mounted';
  });
  await page.locator('.factory-project-controls button').last().tap();
  await expect(page.locator('.factory-inspection h2')).toHaveText('TG Neonatal');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(hero).toHaveAttribute('data-compact', 'true');
  await expect(page.locator('.production-canvas canvas')).toHaveAttribute(
    'data-rotation-probe',
    'mounted',
  );
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.factory-inspection h2')).toHaveText('TG Neonatal');
  const stage = await page.locator('.factory-scene').boundingBox();
  expect(stage?.x).toBeGreaterThan(0);
  expect(stage?.height).toBeLessThan(330);
  await page.getByRole('button', { name: /Close inspection|Fechar inspeção/ }).tap();
  await expect(page.locator('.factory-project-controls button').last()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(844);
});

test('a tap on the real crate opens inspection and a vertical swipe on the canvas scrolls', async ({
  page,
}) => {
  test.setTimeout(65_000);
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  await page.locator('.factory-pause').tap();
  const projector = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('.production-canvas canvas')!;
    const url = performance
      .getEntriesByType('resource')
      .find(({ name }) => name.includes('/@react-three_fiber.js'))!.name;
    const { _roots } = await import(url);
    const { scene, camera } = _roots.get(canvas).store.getState();
    const world = scene.getObjectByName('project-crate-2').position;
    const point = world.clone().set(world.x, 2, 1.1).project(camera);
    const box = canvas.getBoundingClientRect();
    return {
      x: box.left + ((1 + point.x) * box.width) / 2,
      y: box.top + ((1 - point.y) * box.height) / 2,
    };
  });
  await page.touchscreen.tap(projector.x, projector.y);
  await expect(page.locator('.factory-inspection h2')).toHaveText('Fuzz Deck');
  await expect(page.locator('.factory-inspection')).toHaveAttribute('data-origin', 'crate');
  await page.getByRole('button', { name: /Close inspection|Fechar inspeção/ }).tap();
  await expect(page.locator('.factory-inspection')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const rect = (await page.locator('.factory-scene').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  try {
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height - 24;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let delta = 30; delta <= 180; delta += 30) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - delta }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(30);
  await expect(page.locator('.factory-inspection')).toHaveCount(0);
});
