import { expect, it } from 'vitest';
import { graphicsSettings, parseGraphicsProfiles, resolveResolution } from './factoryGraphics';

it('keeps ULTRA native and fixed and validates independent overrides', () => {
  expect(graphicsSettings('ultra', 'high', {})).toMatchObject({
    scale: 100,
    aa: 'msaa',
    dynamic: false,
    shadows: 'ultra',
    textures: 'high',
  });
  expect(graphicsSettings('high', 'high', {})).toMatchObject({
    scale: null,
    aa: 'off',
    dynamic: false,
  });
  expect(
    parseGraphicsProfiles(
      '{"ultra":{"scale":150,"aa":"unsupported","fps":30,"dynamic":false},"auto":{"scale":33}}',
    ),
  ).toEqual({ ultra: { scale: 150, fps: 30, dynamic: false } });
});

it('scales physical pixels once and reports the hardware ceiling independently', () => {
  const source = { width: 3440, height: 1159, device: 1, compact: false, tier: 'high' as const };
  const ultra = graphicsSettings('ultra', 'high', {});
  expect(resolveResolution(source, ultra, [16384, 16384])).toEqual({
    dpr: 1,
    requestedDpr: 1,
    limited: false,
  });
  expect(
    resolveResolution({ ...source, device: 2 }, { ...ultra, scale: 50 }, [16384, 16384]).dpr,
  ).toBe(1);
  expect(
    resolveResolution({ ...source, device: 1.25 }, { ...ultra, scale: 150 }, [16384, 16384]).dpr,
  ).toBe(1.875);
  expect(resolveResolution(source, { ...ultra, scale: 200 }, [4096, 4096])).toMatchObject({
    requestedDpr: 2,
    limited: true,
  });
  expect(
    resolveResolution({ ...source, tier: 'low' }, { ...ultra, dynamic: true }, [16384, 16384]).dpr,
  ).toBe(0.6);
});
