import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(
  `<style>body{margin:0}</style>${await readFile(new URL('../public/assets/social.svg', import.meta.url), 'utf8')}`,
);
await page.screenshot({ path: 'public/assets/social.png' });
await browser.close();
