import { expect, test } from '@playwright/test';
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight } from 'three';
import type { AmbientEvent, EventId } from '../src/lib/ambientEvents';

declare global {
  interface Window {
    __fuzzsAmbient?: {
      trigger(id: EventId): boolean;
      snapshot(): {
        enabled: boolean;
        time: number;
        current: AmbientEvent | null;
        naturalCount: number;
      };
    };
  }
}

test('common, uncommon and rare events use existing equipment while the main belt is paused', async ({
  page,
}) => {
  test.setTimeout(115_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => localStorage.setItem('fuzzs-quality', 'medium'));
  await page.goto('/');
  await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor();
  await page.waitForFunction(() => (window.__fuzzsAmbient?.snapshot().time ?? 0) > 0);
  await page.locator('.factory-pause').click();
  await expect(page.locator('.factory-pause')).toHaveAttribute('aria-pressed', 'true');

  const samples = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas[aria-hidden="true"]');
    const fiberUrl = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.includes('/@react-three_fiber.js'))?.name;
    if (!canvas || !fiberUrl) throw new Error('The Three.js scene did not load.');
    const fiber = await import(fiberUrl);
    const scene: Object3D = fiber._roots.get(canvas).store.getState().scene;
    const debug = window.__fuzzsAmbient!;
    const emissive = (name: string) =>
      ((scene.getObjectByName(name) as Mesh).material as MeshStandardMaterial).emissiveIntensity;
    const sign = (scene.getObjectByName('transfer-nameplate') as Mesh)
      .material as MeshBasicMaterial;
    const signId = sign.map?.uuid;
    const readings: [EventId, () => number][] = [
      ['dock', () => Math.max(emissive('infeed-signal'), emissive('transfer-signal')) - 0.54],
      ['salvage', () => emissive('salvage-status-light') - 0.07],
      ['window', () => (scene.getObjectByName('distant-event') as PointLight).intensity],
      ['log', () => Number(sign.map?.uuid !== signId)],
    ];
    const frame = () => new Promise(requestAnimationFrame);
    const samples = [];
    for (const [id, read] of readings) {
      const deadline = performance.now() + 20_000;
      while (debug.snapshot().current && performance.now() < deadline) await frame();
      if (!debug.trigger(id)) throw new Error(`Could not start ${id}`);
      const source = debug.snapshot().current?.source;
      const overlapped = debug.trigger('gel');
      let peak = 0;
      let sleepingPeak = 0;
      while (debug.snapshot().current?.id === id && performance.now() < deadline) {
        await frame();
        peak = Math.max(peak, read());
        sleepingPeak = Math.max(sleepingPeak, emissive('turret-lens-sleeping'));
      }
      samples.push({ id, source, overlapped, peak, sleepingPeak, remaining: read() });
    }
    return samples;
  });
  expect(samples).toHaveLength(4);
  for (const sample of samples) {
    expect(sample.source, sample.id).toBe('debug');
    expect(sample.overlapped, sample.id).toBe(false);
    expect(sample.peak, sample.id).toBeGreaterThan(0.08);
    expect(sample.sleepingPeak, sample.id).toBe(0);
    expect(sample.remaining, sample.id).toBeCloseTo(0);
  }

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => !window.__fuzzsAmbient!.snapshot().enabled);
  const hidden = await page.evaluate(() => window.__fuzzsAmbient!.snapshot().time);
  await page.waitForTimeout(750);
  expect(await page.evaluate(() => window.__fuzzsAmbient!.snapshot().time)).toBe(hidden);
  expect(await page.evaluate(() => window.__fuzzsAmbient!.trigger('dock'))).toBe(false);

  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(900);
  await page.waitForFunction(() => !window.__fuzzsAmbient!.snapshot().enabled);
  expect(await page.evaluate(() => window.__fuzzsAmbient!.trigger('dock'))).toBe(false);
  expect(await page.evaluate(() => window.__fuzzsAmbient!.snapshot().current)).toBeNull();
});

test('reduced motion allows the optional supervisor reaction but suspends ambient effects', async ({
  page,
}) => {
  test.setTimeout(40_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__fuzzsAmbient));
  expect(await page.evaluate(() => window.__fuzzsAmbient!.trigger('window'))).toBe(false);
  expect(await page.evaluate(() => window.__fuzzsAmbient!.snapshot().time)).toBe(0);

  const supervisor = page.getByTestId('hero-eye');
  await supervisor.locator('.supervisor-trigger').evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
    button.click();
  });
  await expect(supervisor).toHaveAttribute('data-reaction', 'curious');
  await expect(supervisor).toContainText(/Terceiro sinal recebido|Third signal received/);
  await page.locator('.factory-project-controls button').first().click();
  await expect(page.locator('.factory-inspection h2')).toBeVisible();
});
