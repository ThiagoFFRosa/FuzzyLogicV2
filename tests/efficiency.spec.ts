import { expect, test } from '@playwright/test';

test('factory batches share their geometry and release it once when the renderer is removed', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'high'));
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  const readSupports = () =>
    page.evaluate(async () => {
      const canvas = document.querySelector('.production-canvas canvas');
      const fiber = performance
        .getEntriesByType('resource')
        .find(({ name }) => name.includes('/@react-three_fiber.js'));
      if (!canvas || !fiber) throw new Error('Factory renderer unavailable');
      const { _roots } = await import(fiber.name);
      const { scene } = _roots.get(canvas).store.getState();
      const supports: {
        geometry: { uuid: string; addEventListener(type: string, cb: () => void): void };
        count: number;
      }[] = [];
      scene.traverse(
        (object: {
          isInstancedMesh?: boolean;
          count: number;
          geometry?: {
            uuid: string;
            parameters?: { width?: number; height?: number; depth?: number };
            addEventListener(type: string, cb: () => void): void;
          };
        }) => {
          const { width, height, depth } = object.geometry?.parameters ?? {};
          if (object.isInstancedMesh && width === 0.28 && height === 1.22 && depth === 0.38)
            supports.push({ geometry: object.geometry!, count: object.count });
        },
      );
      const state = window as Window & { __fuzzsResourceTest?: { releases: number } };
      if (!state.__fuzzsResourceTest && supports[0]) {
        const tracked = { releases: 0 };
        supports[0].geometry.addEventListener('dispose', () => tracked.releases++);
        state.__fuzzsResourceTest = tracked;
      }
      return supports.map(({ geometry, count }) => ({ id: geometry.uuid, count }));
    });
  const initial = await readSupports();
  expect(initial).toHaveLength(3);
  expect(initial.map(({ count }) => count)).toEqual([4, 4, 4]);
  expect(new Set(initial.map(({ id }) => id)).size).toBe(1);

  const quality = page.locator('.factory-quality select');
  await quality.selectOption('medium');
  await expect(page.locator('.production-canvas')).toHaveAttribute('data-quality', 'medium');
  expect(await readSupports()).toEqual(initial);
  await quality.selectOption('off');
  await expect(page.locator('.production-canvas canvas')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __fuzzsResourceTest?: { releases: number } }).__fuzzsResourceTest
            ?.releases,
      ),
    )
    .toBe(1);

  await quality.selectOption('high');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  const restored = await readSupports();
  expect(restored.map(({ count }) => count)).toEqual([4, 4, 4]);
  expect(restored[0].id).not.toBe(initial[0].id);
});
