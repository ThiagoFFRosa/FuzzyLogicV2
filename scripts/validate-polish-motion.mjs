import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: 'artifacts/polish-motion', size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:5180');
await page.locator('.robotic-core.is-active').first().waitFor();
const value = (property) =>
  page.locator('#home').evaluate((el, p) => el.style.getPropertyValue(p), property);
const orbit = () =>
  page.locator('.orbit-a').evaluate((el) => getComputedStyle(el, '::after').offsetDistance);
const firstOrbit = await orbit();
await page.mouse.move(150, 250);
await page.waitForTimeout(450);
await page.mouse.move(1250, 500);
await page.waitForTimeout(70);
const earlyLight = parseFloat(await value('--scene-light-x'));
await page.waitForTimeout(500);
const settledLight = parseFloat(await value('--scene-light-x'));
assert(settledLight > earlyLight, 'Light must ease toward the pointer');
assert.notEqual(firstOrbit, await orbit(), 'Orbital particles must travel');
await page.evaluate(() => window.scrollTo({ top: 220, behavior: 'instant' }));
await page.waitForTimeout(450);
const scrollDepth = parseFloat(await value('--scene-scroll'));
assert(scrollDepth > 0 && scrollDepth <= 20, 'Scroll parallax must remain subtle and bounded');
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.locator('.theme-button').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/polish-after/mode-transition.png' });
await page.waitForTimeout(800);
assert.deepEqual(errors, []);
await context.close();
const reduced = await browser.newPage({ reducedMotion: 'reduce' });
await reduced.goto('http://127.0.0.1:5180');
await reduced.mouse.move(900, 100);
await reduced.evaluate(() => window.scrollTo({ top: 150, behavior: 'instant' }));
assert.equal(
  await reduced.locator('#home').evaluate((el) => el.style.getPropertyValue('--scene-scroll')),
  '',
);
assert.equal(
  await reduced.locator('.chamber-title').evaluate((el) => getComputedStyle(el).transform),
  'none',
);
await browser.close();
console.log(
  JSON.stringify({
    earlyLight,
    settledLight,
    scrollDepth,
    orbitalMotion: true,
    reducedMotion: true,
    pageErrors: errors,
  }),
);
