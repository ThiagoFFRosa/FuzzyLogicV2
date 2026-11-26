import { chromium } from '@playwright/test';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    reducedMotion: 'reduce',
  });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-core', 'blue');
    localStorage.setItem('fuzzs-locale', 'en');
    localStorage.setItem('fuzzs-quality', 'high');
  });
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5173/');
  await page.addStyleTag({
    content: `
    body { overflow: hidden; }
    .site-header, .skip-link, .laboratory-atmosphere, .sticky-core, #home ~ *,
    #home > :not(.factory-scene, .factory-vignette) { display: none !important; }
    #home { width: 1200px; height: 630px; min-height: 630px; max-height: 630px; border: 0; }
    #home .social-card {
      display: flex !important; flex-direction: column; justify-content: center;
      position: absolute; inset: 0; z-index: 3; padding: 48px 72px;
      color: #edf1ea;
      background: linear-gradient(90deg, #0b151d 10%, #0b151df3 30%, #0b151db0 44%, transparent 73%),
        linear-gradient(0deg, #080e15cf, transparent 30%);
    }
    .social-card .brand { position: absolute; top: 50px; left: 72px; font-size: 34px; }
    .social-card .brand svg { width: 37px; }
    .social-card h1 { max-width: 610px; font: 700 79px/.96 "Space Grotesk Variable", sans-serif; letter-spacing: -.04em; }
    .social-card p { margin-top: 29px; color: #c1dbdc; font-size: 25px; }
    .social-card .site-address { position: absolute; bottom: 42px; left: 72px; color: #81d7fb; font-size: 25px; }
  `,
  });
  await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor({ timeout: 30_000 });
  await page.locator('#home[data-boot="running"]').waitFor({ timeout: 30_000 });
  await page.evaluate(async () => {
    const overlay = document.createElement('div');
    overlay.className = 'social-card';
    const brand = document.querySelector('.site-header .brand').cloneNode(true);
    const title = document.createElement('h1');
    title.append('Ideas in', document.createElement('br'), 'production.');
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Software Engineering & Digital Products';
    const domain = document.createElement('span');
    domain.className = 'site-address';
    domain.textContent = 'fuzzs.dev';
    overlay.append(brand, title, subtitle, domain);
    document.querySelector('#home').append(overlay);
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: 'public/assets/social.png' });
} finally {
  await browser.close();
}
