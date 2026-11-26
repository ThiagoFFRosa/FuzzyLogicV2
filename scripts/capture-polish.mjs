import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const phase = process.argv[2] || 'after';
const directory = `artifacts/polish-${phase}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['ultrawide', 2560, 1080],
  ['mobile', 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-core', 'amber');
    localStorage.setItem('fuzzs-locale', 'pt');
  });
  await page.goto('http://127.0.0.1:5180');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${directory}/${name}-hero.png` });
  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const b = document.querySelector(selector).getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    return {
      core: box('.chamber-core'),
      title: box('.chamber-title'),
      body: box('.core-body svg > circle:nth-of-type(2)'),
      hero: box('#home'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  await page
    .locator('#contact')
    .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.screenshot({ path: `${directory}/${name}-contact.png` });
  if (phase === 'after')
    await page.screenshot({ path: `${directory}/${name}-full.png`, fullPage: true });
  results.push({ name, ...geometry });
  await page.close();
}
await writeFile(`${directory}/measurements.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
await browser.close();
