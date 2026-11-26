import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts/factory', { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-core', 'blue');
    localStorage.setItem('fuzzs-locale', 'pt');
  });
  await page.goto('http://127.0.0.1:5180');
  await page.locator('canvas').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `artifacts/factory/${name}-hero.png` });
  await page.screenshot({ path: `artifacts/factory/${name}-full.png`, fullPage: true });
  await page.locator('.factory-project-controls button').filter({ hasText: 'Fuzz Deck' }).click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `artifacts/factory/${name}-inspection.png` });
  await page.close();
}
console.log(JSON.stringify({ errors }));
await browser.close();
