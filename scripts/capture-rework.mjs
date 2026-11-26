import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: 'artifacts/motion', size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('fuzzs-core', 'blue');
  localStorage.setItem('fuzzs-locale', 'pt');
});
await page.goto('http://127.0.0.1:5180/');
await page.waitForTimeout(700);
await page.screenshot({ path: 'artifacts/rework-hero.png' });
await page.mouse.move(120, 200);
await page.waitForTimeout(500);
await page.mouse.move(1200, 400);
await page.waitForTimeout(500);
await page.locator('.core-trigger').click();
await page.waitForTimeout(450);
await page.screenshot({ path: 'artifacts/rework-reaction.png' });
await page.locator('.theme-button').click();
await page.waitForTimeout(350);
await page.screenshot({ path: 'artifacts/rework-switch.png' });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'artifacts/rework-desktop.png', fullPage: true });
await page.waitForTimeout(5000);
await context.close();
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await mobile.goto('http://127.0.0.1:5180/');
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: 'artifacts/rework-mobile-hero.png' });
await mobile.screenshot({ path: 'artifacts/rework-mobile.png', fullPage: true });
await browser.close();
