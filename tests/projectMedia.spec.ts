import { expect, test } from '@playwright/test';

test('project screenshots support a cover and supplemental images with localized alt and sizing', async ({
  page,
}) => {
  const photo = (name: string, pt: string, en: string) => ({
    src: `/__test-media/${name}-1280.png`,
    srcSet: `/__test-media/${name}-640.png 640w, /__test-media/${name}-1280.png 1280w`,
    width: 1280,
    height: 720,
    alt: { pt, en },
  });
  await page.addInitScript(() => {
    localStorage.setItem('fuzzs-quality', 'off');
    localStorage.setItem('fuzzs-locale', 'pt');
  });
  await page.route(/\/src\/data\/projects\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const images = [
      photo('panel', 'Painel de demonstração', 'Demo dashboard'),
      photo('retrieval', 'Tela de retirada de demonstração', 'Demo retrieval screen'),
    ];
    const body = `${await response.text()}\nprojects.find(({ id }) => id === 'seuvalet').screenshots = ${JSON.stringify(images)};\n`;
    await route.fulfill({ response, body });
  });
  await page.route('**/__test-media/*.png', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZzgQAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  await page.goto('/');
  const card = page.locator('#projeto-seuvalet');
  const cover = card.getByRole('img', { name: 'Painel de demonstração' });
  await expect(cover).toHaveAttribute('loading', 'lazy');
  await expect(cover).toHaveAttribute('width', '1280');
  await expect(cover).toHaveAttribute('srcset', /640w/);
  await card.getByRole('button', { name: /Explorar projeto/ }).press('Enter');
  await expect(card.getByRole('img', { name: 'Tela de retirada de demonstração' })).toBeVisible();
  await page.locator('.language-button').click();
  await expect(card.getByRole('img', { name: 'Demo retrieval screen' })).toBeVisible();
});
