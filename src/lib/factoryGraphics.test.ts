import { expect, it } from 'vitest';
import {
  graphicsSettings,
  parseGraphicsProfiles,
  resolveResolution,
  shadowMapSize,
} from './factoryGraphics';

it('sets the four fixed scales and leaves AUTO adaptive', () => {
  expect(
    (['low', 'medium', 'high', 'ultra', 'auto'] as const).map(
      (preset) => graphicsSettings(preset, {}).scale,
    ),
  ).toEqual([50, 75, 100, 125, null]);
  expect(shadowMapSize('main', false)).toBe(1024);
  expect(shadowMapSize('main', true)).toBe(1024);
});

it('preserves supported saved controls and discards retired graphics options', () => {
  expect(
    parseGraphicsProfiles(
      '{"ultra":{"scale":150,"aa":"off","shadows":"off","textures":"high","fps":30,"dynamic":false},"high":{"scale":75,"post":"bloom"},"auto":{"scale":33}}',
    ),
  ).toEqual({ ultra: { fps: 30 }, high: { scale: 75, post: 'bloom' } });
});

it('scales physical pixels once and reports the hardware ceiling independently', () => {
  const source = { width: 3440, height: 1159, device: 1, compact: false, tier: 'high' as const };
  const ultra = graphicsSettings('ultra', {});
  expect(resolveResolution(source, ultra, [16384, 16384])).toEqual({
    dpr: 1.25,
    requestedDpr: 1.25,
    limited: false,
  });
  expect(
    resolveResolution({ ...source, device: 2 }, { ...ultra, scale: 50 }, [16384, 16384]).dpr,
  ).toBe(1);
  expect(resolveResolution({ ...source, device: 1.25 }, ultra, [16384, 16384]).dpr).toBe(1.5625);
  expect(resolveResolution(source, ultra, [4096, 4096])).toMatchObject({
    requestedDpr: 1.25,
    limited: true,
  });
  expect(
    resolveResolution(
      { ...source, width: 800, height: 600, tier: 'low' },
      graphicsSettings('auto', {}),
      [16384, 16384],
    ).dpr,
  ).toBe(0.5);
});
