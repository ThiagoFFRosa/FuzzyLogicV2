import { describe, expect, it } from 'vitest';
import { cameraProfile, productionCamera } from '../../../../lib/factoryCamera';
import { importConfigurations, readConfiguration, serializeConfiguration } from './configuration';

describe('official factory camera', () => {
  it('applies the calibrated desktop and ultrawide lenses and preserves compact framing', () => {
    expect(productionCamera(16 / 9, false).camera).toMatchObject({
      position: [10.5, 6.1, 16],
      target: [-3.6, -4.8, -30],
      fov: 41.2,
      zoom: 1,
      near: 0.1,
      far: 100,
      roll: 0,
    });
    expect(productionCamera(1.39, false, 'tablet').camera.fov).toBeCloseTo(48);
    expect(productionCamera(32 / 9, false, cameraProfile(3840, 1080, false)).camera).toEqual({
      profile: 'ultrawide',
      position: [11.399453069945876, 4.231953819787016, 14.192093502556908],
      target: [-5.4, -2, -30],
      fov: 42,
      zoom: 0.95,
      near: 3.301,
      far: 35.002,
      roll: 0,
    });
    expect(productionCamera(0.9, true).camera).toMatchObject({
      position: [6.5, 5.9, 17.2],
      target: [0.7, 3, 0],
      fov: 44,
    });
    expect(productionCamera(1.45, true).camera).toMatchObject({
      position: [7.8, 6.6, 18.8],
      target: [0.5, 2.9, 0],
      fov: 38,
    });
    expect(cameraProfile(1024, 768, false)).toBe('tablet');
    expect(cameraProfile(640, 360, true)).toBe('mobile-landscape');
  });
});

describe('camera configuration interchange', () => {
  const camera = { ...productionCamera(1.7, false).camera, roll: 16.125, zoom: 1.3 };
  it('round-trips without rounding the effective lens or coordinates', () => {
    expect(importConfigurations(serializeConfiguration(camera, 'json'))).toEqual([camera]);
    expect(importConfigurations(JSON.stringify({ desktop: camera }))).toEqual([camera]);
    expect(serializeConfiguration(camera, 'ts')).toContain('satisfies CameraConfiguration');
  });
  it('rejects incomplete, degenerate and mismatched records', () => {
    for (const item of [
      { ...camera, fov: 165 },
      { ...camera, near: camera.far },
      { ...camera, position: camera.target },
      { ...camera, target: [0, -Infinity, 10] },
      { ...camera, zoom: '1.3' },
      { ...camera, roll: undefined },
    ])
      expect(() => readConfiguration(item)).toThrow();
    expect(() => importConfigurations(JSON.stringify({ tablet: camera }))).toThrow(/profile/);
  });
});
