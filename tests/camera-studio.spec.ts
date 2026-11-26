import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { productionCamera } from '../src/lib/factoryCamera';

const desktopCamera = productionCamera(16 / 9, false, 'desktop').camera;
const ultrawideCamera = productionCamera(32 / 9, false, 'ultrawide').camera;

async function readScene(page: Page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('.production-canvas canvas');
    const moduleUrl = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js'))?.name;
    if (!canvas || !moduleUrl) throw new Error('Missing factory renderer');
    const fiber = await import(moduleUrl);
    const { camera, scene, events } = fiber._roots.get(canvas).store.getState();
    const crate = scene.getObjectByName('project-crate-2');
    return {
      position: camera.position.toArray() as number[],
      quaternion: camera.quaternion.toArray() as number[],
      fov: camera.fov as number,
      zoom: camera.zoom as number,
      near: camera.near as number,
      far: camera.far as number,
      events: events.enabled as boolean,
      crateX: crate.position.x as number,
      helpers: scene.children.map((child: { type: string }) => child.type) as string[],
    };
  });
}

test('adjusts the active camera and synchronizes orbit, pan, dolly and production controls', async ({
  page,
}) => {
  test.setTimeout(100_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'low'));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?camera=1');
  const panel = page.getByRole('complementary', { name: 'Camera Studio' });
  const button = (name: string) => panel.getByRole('button', { name, exact: true });
  const number = (name: string) => panel.getByRole('spinbutton', { name, exact: true });
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  const initial = await readScene(page);
  await expect(button('Production Camera')).toHaveAttribute('aria-pressed', 'true');
  expect(initial.position).toEqual(desktopCamera.position);

  await button('Free Camera').click();
  await expect.poll(async () => (await readScene(page)).events).toBe(false);
  for (const [name, value] of [
    ['Position X', '13.125'],
    ['Target Y', '2.75'],
    ['FOV', '45'],
    ['Zoom', '1.25'],
    ['Near', '0.2'],
    ['Far', '180'],
    ['Roll (°)', '14'],
  ]) {
    await number(name).fill(value);
    await number(name).press('Tab');
  }
  await expect.poll(async () => (await readScene(page)).position[0]).toBe(13.125);
  expect(await readScene(page)).toMatchObject({ fov: 45, zoom: 1.25, near: 0.2, far: 180 });
  const expected = new PerspectiveCamera();
  expected.position.set(13.125, desktopCamera.position[1], desktopCamera.position[2]);
  expected.lookAt(desktopCamera.target[0], 2.75, desktopCamera.target[2]);
  expected.rotateZ(MathUtils.degToRad(14));
  expect((await readScene(page)).quaternion).toEqual(expected.quaternion.toArray());
  const slider = panel.getByRole('slider', { name: 'Position X slider', exact: true });
  await slider.press('ArrowRight');
  await expect.poll(async () => (await readScene(page)).position[0]).toBeCloseTo(13.14, 2);
  await number('Near').fill('200');
  await expect(panel.getByRole('status')).toContainText('Near must be smaller than Far');
  await number('Near').press('Escape');
  expect((await readScene(page)).near).toBe(0.2);

  await button('Minimize panel').click();
  const canvas = page.locator('.production-canvas canvas');
  const point = await canvas.boundingBox();
  if (!point) throw new Error('Missing canvas bounds');
  const x = point.x + point.width * 0.44;
  const y = point.y + point.height * 0.46;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 105, y + 20, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await readScene(page)).position[0]).not.toBeCloseTo(13.14, 1);
  const orbited = await readScene(page);
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 38, y + 30, { steps: 3 });
  await page.mouse.up({ button: 'right' });
  await expect
    .poll(async () => (await readScene(page)).position[1])
    .not.toBeCloseTo(orbited.position[1], 1);
  const panned = (await readScene(page)).position;
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await readScene(page)).position).not.toEqual(panned);
  await expect(page.locator('.factory-inspection')).toHaveCount(0);
  await button('Expand panel').click();
  expect(Number(await number('Position X').inputValue())).toBeCloseTo(
    (await readScene(page)).position[0],
    5,
  );
  expect(Number(await number('Target Y').inputValue())).not.toBeCloseTo(2.75, 1);
  await panel.getByRole('checkbox', { name: 'Orbit controls' }).uncheck();
  await expect.poll(async () => (await readScene(page)).events).toBe(true);
  const held = (await readScene(page)).position;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 3 });
  await page.mouse.up();
  expect((await readScene(page)).position).toEqual(held);

  await button('Reset optics').click();
  expect(await readScene(page)).toMatchObject({
    position: held,
    fov: initial.fov,
    zoom: 1,
    near: 0.1,
    far: 100,
  });
  await button('Restore default').click();
  await expect.poll(async () => (await readScene(page)).position).toEqual(initial.position);
  await button('Scene').click();
  await panel.getByRole('checkbox', { name: 'Pause conveyor' }).check();
  await panel.getByRole('checkbox', { name: 'Suspend ambient events' }).check();
  const crateX = (await readScene(page)).crateX;
  await panel.getByRole('checkbox', { name: 'Hide HTML' }).check();
  await expect(page.locator('.factory-heading')).toBeHidden();
  await panel.getByRole('checkbox', { name: 'Rule of thirds' }).check();
  await expect(page.locator('.camera-studio-thirds')).toBeVisible();
  await panel.getByRole('checkbox', { name: 'Headline' }).check();
  await expect(page.locator('.camera-studio-landmarks')).toContainText('Headline');
  for (const name of [
    'Target marker',
    'XYZ axes',
    'Ground grid',
    'Light helpers',
    'Shadow bounds',
    'Bounding box',
    'Wireframe',
  ])
    await panel.getByRole('checkbox', { name, exact: true }).check();
  await expect
    .poll(async () => (await readScene(page)).helpers)
    .toEqual(expect.arrayContaining(['AxesHelper', 'GridHelper', 'BoxHelper']));
  expect((await readScene(page)).crateX).toBe(crateX);
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & { __fuzzsAmbient?: { snapshot(): { enabled: boolean } } }
        ).__fuzzsAmbient?.snapshot().enabled,
    ),
  ).toBe(false);
  await page.keyboard.press('Alt+h');
  await expect(page.locator('.factory-heading')).toBeVisible();
  await button('Production Camera').click();
  expect((await readScene(page)).quaternion).toEqual(initial.quaternion);
  await page.keyboard.press('Control+Shift+k');
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.camera-studio-guides')).toHaveCount(0);
  await expect.poll(async () => (await readScene(page)).helpers).not.toContain('GridHelper');
  expect(errors).toEqual([]);
});

test('stores presets, round-trips configurations and simulates real viewports', async ({
  page,
  context,
}) => {
  test.setTimeout(100_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'low'));
  await page.goto('/');
  const panel = page.getByRole('complementary', { name: 'Camera Studio' });
  await expect(panel).toHaveCount(0);
  await page.keyboard.press('Control+Shift+k');
  await expect(panel).toBeVisible();
  const tab = (name: string) => panel.getByRole('button', { name, exact: true });
  const profile = panel.getByRole('combobox', { name: 'Device profile' });
  const viewport = panel.getByRole('combobox', { name: 'Viewport' });
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  const before = await panel.boundingBox();
  if (!before) throw new Error('Missing Camera Studio');
  await panel.getByRole('button', { name: 'Move panel' }).press('ArrowLeft');
  expect((await panel.boundingBox())!.x).toBeLessThan(before.x);
  await profile.selectOption('ultrawide');
  await panel.getByRole('spinbutton', { name: 'Position X', exact: true }).fill('16.25');
  await tab('Presets & I/O').click();
  const name = panel.getByRole('textbox', { name: 'Preset name' });
  const transfer = panel.getByRole('textbox', { name: 'Configuration', exact: true });
  const saved = panel.getByRole('combobox', { name: 'Saved preset' });
  await name.fill('Wide test');
  await tab('Save as new').click();
  await tab('Copy Camera Configuration').click();
  const json = await transfer.inputValue();
  expect(JSON.parse(json)).toMatchObject({
    ...ultrawideCamera,
    position: [16.25, ultrawideCamera.position[1], ultrawideCamera.position[2]],
  });
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(
    JSON.parse(json),
  );

  await name.fill('Cinematic test');
  await tab('Rename').click();
  await tab('Duplicate').click();
  await expect(saved.locator('option')).toHaveCount(3);
  await tab('Delete').click();
  await expect(saved.locator('option')).toHaveCount(2);
  await tab('Copy all profiles').click();
  expect(Object.keys(JSON.parse(await transfer.inputValue()))).toHaveLength(5);
  await panel.getByRole('combobox', { name: 'Export format' }).selectOption('ts');
  await tab('Copy Camera Configuration').click();
  expect(await transfer.inputValue()).toContain('satisfies CameraConfiguration');
  await transfer.fill('{"profile":"desktop"}');
  await tab('Import JSON').click();
  await expect(panel.getByRole('status')).toContainText('position must contain');
  await expect(profile).toHaveValue('ultrawide');
  await transfer.fill(json);
  await tab('Import JSON').click();
  await expect(panel.getByRole('status')).toContainText('Imported Ultrawide');

  await viewport.selectOption('9:16');
  const frame = page.frameLocator('iframe[title^="Simulated viewport"]');
  await expect(frame.locator('#home')).toHaveAttribute('data-compact', 'true', { timeout: 35_000 });
  expect(await frame.locator('html').evaluate(() => [innerWidth, innerHeight])).toEqual([432, 768]);
  await expect(frame.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  await tab('Production Camera').click();
  await expect(profile).toHaveValue('mobile-portrait');
  await viewport.selectOption('32:9');
  await expect(frame.locator('#home')).toHaveAttribute('data-compact', 'false');
  await expect
    .poll(() => frame.locator('html').evaluate(() => [innerWidth, innerHeight]))
    .toEqual([3840, 1080]);
  await expect(profile).toHaveValue('ultrawide');
  await viewport.selectOption('Mobile landscape');
  await expect(profile).toHaveValue('mobile-landscape');
  await viewport.selectOption('4:3');
  await expect(profile).toHaveValue('tablet');
  await viewport.selectOption('');
  await expect(page.locator('.camera-studio-simulation')).toHaveCount(0);
  await profile.selectOption('ultrawide');
  await tab('Camera').click();
  await expect(panel.getByRole('spinbutton', { name: 'Position X', exact: true })).toHaveValue(
    '16.25',
  );
  await page.goto('/?camera=1');
  await tab('Presets & I/O').click();
  await saved.selectOption({ label: 'Cinematic test · Ultrawide' });
  await tab('Camera').click();
  await expect(panel.getByRole('spinbutton', { name: 'Position X', exact: true })).toHaveValue(
    '16.25',
  );
});

test('picks containers through the calibrated camera when orbit controls are off', async ({
  page,
}) => {
  test.setTimeout(50_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'low'));
  await page.goto('/?camera=1');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  await page.getByRole('button', { name: 'Free Camera', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Orbit controls' }).uncheck();
  await page.getByRole('spinbutton', { name: 'Position X', exact: true }).fill('8');
  await page.getByRole('spinbutton', { name: 'Target X', exact: true }).fill('1.5');
  await page.getByRole('spinbutton', { name: 'FOV', exact: true }).fill('39');
  await page.getByRole('button', { name: 'Minimize panel' }).click();
  await expect.poll(async () => (await readScene(page)).position[0]).toBe(8);
  const bounds = await page.locator('.factory-scene').boundingBox();
  if (!bounds) throw new Error('Missing factory viewport');
  const camera = new PerspectiveCamera(39, bounds.width / bounds.height, 0.1, 100);
  camera.position.set(8, desktopCamera.position[1], desktopCamera.position[2]);
  camera.lookAt(1.5, desktopCamera.target[1], desktopCamera.target[2]);
  camera.updateMatrixWorld();
  const projected = new Vector3(0, 2, 1.13).project(camera);
  await page.mouse.click(
    bounds.x + ((projected.x + 1) * bounds.width) / 2,
    bounds.y + ((1 - projected.y) * bounds.height) / 2,
  );
  await expect(page.locator('.factory-inspection h2')).toHaveText('Fuzz Deck');
  await expect(page.locator('.factory-inspection')).toHaveAttribute('data-origin', 'crate');
});
