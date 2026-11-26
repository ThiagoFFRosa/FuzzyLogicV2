import { expect, it } from 'vitest';
import {
  AdaptiveQuality,
  initialFactoryQuality,
  parseFactoryQuality,
  renderPixelRatio,
} from './factoryQuality';

it('defaults to AUTO, starts conservatively, and limits large framebuffer allocations', () => {
  expect(parseFactoryQuality(null)).toBe('auto');
  expect(parseFactoryQuality('high')).toBe('high');
  expect(parseFactoryQuality('unexpected')).toBe('auto');
  expect(parseFactoryQuality('off')).toBe('off');
  expect(initialFactoryQuality(390)).toBe('low');
  expect(initialFactoryQuality(1440)).toBe('medium');
  expect(initialFactoryQuality(1440, 4096)).toBe('low');
  const dpr = renderPixelRatio('high', 2560, 1440, 3);
  expect(dpr).toBeLessThan(1.5);
  expect(2560 * 1440 * dpr ** 2).toBeLessThanOrEqual(2_500_001);
});

it('drops for sustained slow frames and only promotes after a long recovery', () => {
  const controller = new AdaptiveQuality('medium');
  const feed = (delta: number, frames: number) => {
    for (let index = 0; index < frames; index++) controller.sample(delta);
  };
  feed(1 / 60, 120);
  feed(0.1, 1);
  expect(controller.level).toBe('medium');
  feed(0.055, 150);
  expect(controller.level).toBe('low');
  feed(1 / 60, 360);
  expect(controller.level).toBe('low');
  feed(1 / 60, 3400);
  expect(controller.level).toBe('high');
});

it('keeps the compact profile from automatically promoting past MEDIUM', () => {
  const controller = new AdaptiveQuality('low', 'medium');
  for (let index = 0; index < 2400; index++) controller.sample(1 / 60);
  expect(controller.level).toBe('medium');
  controller.resetWindow();
  expect(controller.sample(0.4)).toBe('medium');
});
