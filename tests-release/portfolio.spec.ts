import { expect, test } from '@playwright/test';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { projects } from '../src/data/projects';
import { site } from '../src/data/site';

test('the public build excludes Camera Studio and ignores its activation controls', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'off'));
  await page.goto('/?camera=1&camera-preview=1');
  await page.keyboard.press('Control+Shift+k');
  await expect(page.getByRole('complementary', { name: 'Camera Studio' })).toHaveCount(0);
  const assets = (await readdir('dist/assets')).filter((file) => /\.(js|css)$/.test(file));
  expect(assets.join(' ')).not.toMatch(/CameraStudio|CameraDebugController|OrbitControls/i);
  for (const asset of assets) {
    const source = await readFile(`dist/assets/${asset}`, 'utf8');
    expect(
      /camera-studio|Copy Camera Configuration|fuzzs-camera-settings|OrbitControls/.test(source),
      asset,
    ).toBe(false);
  }
});

test('production HTML exposes the five projects, metadata and contact without JavaScript', async ({
  browser,
  request,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ideias em produção.');
    await expect(page.locator('.release-summary article')).toHaveCount(5);
    for (const project of projects) {
      await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
    }
    await page.getByText('Sobre FuzControl', { exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('Mais de mil músicas gerenciadas em um único evento.'),
    ).toBeVisible();
    await expect(page.locator('a[href="mailto:contato@fuzzs.dev"]')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site.url);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new URL(site.shareImage, site.url).href,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent())!,
    );
    expect(
      schema['@graph'].filter((item: { '@type': string }) => item['@type'] === 'CreativeWork'),
    ).toHaveLength(5);
    const image = await request.get(site.shareImage);
    expect(image.ok()).toBe(true);
    const png = await image.body();
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    for (const file of [
      '/favicon.svg',
      '/robots.txt',
      '/sitemap.xml',
      '/third-party-notices.md',
      '/licenses/inter-OFL.txt',
      '/licenses/react-three-fiber-MIT.txt',
    ]) {
      expect((await request.get(file)).ok(), file).toBe(true);
    }
    expect((await request.get('/inexistente')).status()).toBe(404);
  } finally {
    await context.close();
  }
});

test('mobile commercial navigation and contact work in both languages in the production bundle', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-quality', 'off');
    localStorage.setItem('fuzzs-locale', 'pt');
  });
  await page.goto('/');
  await expect(page.locator('.release-summary')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'fuzz.s — início' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^PT \/ EN — Mudar para inglês/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^CORE BLUE — Alternar Core/ })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir navegação' }).press('Enter');
  await page.locator('#primary-navigation a[href="#projects"]').press('Enter');
  await expect(page).toHaveURL(/#projects$/);
  await page.locator('.project-index').getByRole('link', { name: 'TG Neonatal' }).press('Enter');
  await expect(page).toHaveURL(/#projeto-neonatal$/);
  await page.getByRole('button', { name: /Explorar projeto — TG Neonatal/ }).press('Enter');
  await expect(page.locator('#details-neonatal')).toContainText('Sem validação para uso clínico');
  await page.locator('.language-button').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('#details-neonatal')).toContainText('For academic research only');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    site.description.en,
  );
  await expect(page.locator('#contact a').first()).toHaveAttribute(
    'href',
    'mailto:contato@fuzzs.dev',
  );
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(errors).toEqual([]);
});

test('the production 3D bundle and its delayed modules load and keep inspection across quality changes', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 1080, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const scene = page.locator('.production-canvas');
  await expect(scene).toHaveAttribute('data-scenery-ready', 'true', { timeout: 25_000 });
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running');
  await page.locator('.factory-project-controls button').nth(1).press('Enter');
  await expect(page.locator('.factory-inspection h2')).toHaveText('SeuValet');
  await expect(page.locator('.factory-inspection')).toContainText(/QR Code/i);
  await page.locator('.factory-quality select').selectOption('low');
  await expect(scene).toHaveAttribute('data-quality', 'low');
  await expect(page.locator('.factory-inspection h2')).toHaveText('SeuValet');
  await page.locator('.factory-quality select').selectOption('ultra');
  await expect(scene).toHaveAttribute('data-quality', 'ultra');
  await expect(scene).toHaveAttribute('data-dynamic-resolution', 'false', { timeout: 25_000 });
  await expect
    .poll(() =>
      scene.locator('canvas').evaluate((element: HTMLCanvasElement) => {
        const context = element.getContext('webgl2');
        const expected = Math.floor(
          element.getBoundingClientRect().width * devicePixelRatio * 1.25,
        );
        return Math.abs((context?.drawingBufferWidth ?? 0) - expected);
      }),
    )
    .toBeLessThanOrEqual(1);
  await expect(page.locator('.factory-inspection h2')).toHaveText('SeuValet');
  expect(await page.evaluate(() => '__fuzzsAmbient' in window)).toBe(false);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 25_000 });
  await expect(page.locator('.facility-boot')).toHaveCount(0);
});

test('the production boot waits for the fonts used by the factory labels on mobile', async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fuzzs-locale', 'en'));
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/*space-grotesk*.woff2', async (route) => {
    await delayed;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const boot = page.locator('.facility-boot');
    await expect(boot).toHaveAttribute('data-stage', 'fonts', { timeout: 15_000 });
    await expect(boot.getByRole('progressbar', { name: 'Startup progress' })).toHaveAttribute(
      'aria-valuenow',
      '22',
    );
    await expect(page.locator('.production-canvas')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Go to projects' })).toBeVisible();
    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await cdp.detach();
    await mkdir('artifacts/boot', { recursive: true });
    await writeFile('artifacts/boot/mobile-blue.png', Buffer.from(data, 'base64'));
    release();
    await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', {
      timeout: 25_000,
    });
    await expect(page.locator('.facility-boot')).toHaveCount(0);
  } finally {
    release();
  }
});
