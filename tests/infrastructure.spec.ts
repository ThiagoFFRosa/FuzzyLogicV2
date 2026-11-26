import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Mesh, MeshStandardMaterial, Object3D, ShaderMaterial } from 'three';

async function infrastructureState(page: Page) {
  await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor();
  return page.evaluate(async () => {
    const canvas = document.querySelector('canvas[aria-hidden="true"]');
    const fiberUrl = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js'))?.name;
    if (!canvas || !fiberUrl) throw new Error('The Three.js scene did not load.');
    const fiber = await import(fiberUrl);
    const scene: Object3D = fiber._roots.get(canvas).store.getState().scene;
    const object = (name: string) => {
      const found = scene.getObjectByName(name);
      if (!found) throw new Error(`Missing factory object: ${name}`);
      return found;
    };
    const fluid = ['GEL-B', 'GEL-A', 'GEL-W'].map((id) => {
      const pipe = object(id);
      const material = pipe.children
        .map((child) => (child as Mesh).material)
        .find(
          (candidate): candidate is ShaderMaterial =>
            !Array.isArray(candidate) && candidate?.type === 'ShaderMaterial',
        );
      if (!material) throw new Error(`Missing fluid: ${id}`);
      return {
        color: material.uniforms.tint.value.getHexString(),
        travel: material.uniforms.travel.value as number,
      };
    });
    const route = object('maintenance-return');
    const carrier = route.getObjectByName('turret-model-damaged')?.parent;
    if (!carrier) throw new Error('The maintenance carrier did not load.');
    const salvage = (scene.getObjectByName('salvage-status-light') as Mesh | undefined)
      ?.material as MeshStandardMaterial | undefined;
    return {
      upperRoute: Boolean(scene.getObjectByName('upper-transfer')),
      main: object('project-crate-2').position.x,
      drive: object('drive-output-shaft').rotation.z,
      carrier: carrier.position.toArray(),
      fluid,
      floor: Boolean(scene.getObjectByName('floor-breaks')),
      salvageIntensity: salvage?.emissiveIntensity ?? null,
    };
  });
}

test('the main drive pauses together while maintenance cargo and fluid keep moving', async ({
  page,
}) => {
  test.setTimeout(55_000);
  await page.goto('/');
  await page.locator('canvas[aria-hidden="true"]').waitFor();
  const initial = await infrastructureState(page);
  await expect
    .poll(async () => (await infrastructureState(page)).main, { timeout: 10_000 })
    .not.toBe(initial.main);
  expect((await infrastructureState(page)).drive).not.toBe(initial.drive);

  await page.locator('.factory-pause').click();
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'true');
  const braking = await infrastructureState(page);
  await expect
    .poll(async () => (await infrastructureState(page)).fluid[0].travel, { timeout: 15_000 })
    .toBeGreaterThan(braking.fluid[0].travel + 0.95);
  const paused = await infrastructureState(page);
  await expect
    .poll(async () => (await infrastructureState(page)).fluid[0].travel, { timeout: 10_000 })
    .toBeGreaterThan(paused.fluid[0].travel);
  const running = await infrastructureState(page);
  expect(running.main).toBe(paused.main);
  expect(running.drive).toBe(paused.drive);
  expect(running.carrier).not.toEqual(paused.carrier);

  await page.locator('.factory-pause').click();
  await expect
    .poll(async () => (await infrastructureState(page)).drive, { timeout: 10_000 })
    .not.toBe(paused.drive);
});

test('reduced motion holds both circuits still and theme changes retain every fluid color', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('canvas[aria-hidden="true"]').waitFor();
  const blue = await infrastructureState(page);
  expect(blue.upperRoute).toBe(true);
  expect(blue.floor).toBe(true);
  expect(blue.salvageIntensity).toBe(0.07);
  expect(new Set(blue.fluid.map(({ color }) => color)).size).toBe(3);

  await page.locator('.theme-button').click();
  const amber = await infrastructureState(page);
  expect(amber.fluid).toEqual(blue.fluid);
  expect(amber.carrier).toEqual(blue.carrier);
  expect(amber.main).toBe(blue.main);
  expect(amber.salvageIntensity).toBe(blue.salvageIntensity);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await infrastructureState(page)).upperRoute).toBe(false);
  const mobile = await infrastructureState(page);
  expect(mobile.floor).toBe(true);
  expect(mobile.salvageIntensity).toBeNull();
  await expect(page.locator('.factory-project-controls button')).toHaveCount(5);
});

test('the rebuilt turret remains on the belt and clears the scanner on the warning pass', async ({
  page,
}) => {
  test.setTimeout(55_000);
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'low'));
  await page.goto('/');
  await expect(page.locator('#home')).toHaveAttribute('data-boot', 'running', { timeout: 35_000 });
  const crossing = await page.evaluate(async () => {
    const canvas = document.querySelector('.production-canvas canvas')!;
    const resources = performance.getEntriesByType('resource');
    const [{ _roots }, { Box3 }] = await Promise.all([
      import(resources.find(({ name }) => name.includes('/@react-three_fiber.js'))!.name),
      import(resources.find(({ name }) => name.includes('/three.js'))!.name),
    ]);
    const sceneRoot = _roots.get(canvas).store;
    const { scene, setFrameloop } = sceneRoot.getState();
    const turret = scene.getObjectByName('factory-turret-damaged');
    const wash = scene.getObjectByName('scanner-wash');
    const scanner = wash.parent;
    const marker = scanner.position.x;
    setFrameloop('never');
    const state = sceneRoot.getState();
    const tick = () => {
      state.clock.elapsedTime += 0.05;
      for (const { ref, priority, store } of state.internal.subscribers) {
        if (priority <= 0) ref.current(store.getState(), 0.05);
      }
    };
    for (let index = 0; index < 1200; index++) {
      const previous = turret.position.x;
      tick();
      if (previous >= marker || turret.position.x < marker) continue;
      const bounds = new Box3().setFromObject(turret, true);
      for (let frame = 0; frame < 4; frame++) tick();
      return {
        footY: bounds.min.y,
        roofClearance: 4.29 - bounds.max.y,
        sideClearance: 2.03 - Math.max(-bounds.min.z, bounds.max.z),
        wash: wash.intensity,
        fog: scene.fog?.isFog,
      };
    }
    throw new Error('The damaged turret did not cross the scanner.');
  });
  expect(crossing.footY).toBeCloseTo(0.905, 2);
  expect(crossing.roofClearance).toBeGreaterThan(0.5);
  expect(crossing.sideClearance).toBeGreaterThan(0.5);
  expect(crossing.wash).toBeGreaterThan(0);
  expect(crossing.fog).toBe(true);
});
