import { expect, it, vi } from 'vitest';
import { FactoryBoxes } from './factoryGeometry';

it('shares identical box dimensions and keeps tiled concrete UVs separate', () => {
  const boxes = new FactoryBoxes();
  const standard = boxes.get([8, 4, 12]);
  const concrete = boxes.get([8, 4, 12], true);
  expect(boxes.get([8, 4, 12])).toBe(standard);
  expect(boxes.get([8, 4, 12], true)).toBe(concrete);
  expect(boxes.get([4, 8, 12])).not.toBe(standard);
  expect(concrete.attributes.position.array).toEqual(standard.attributes.position.array);
  expect(concrete.attributes.normal.array).toEqual(standard.attributes.normal.array);
  expect(concrete.attributes.uv.getX(1)).toBe(3);
  expect(standard.attributes.uv.getX(1)).toBe(1);
  const released = vi.fn();
  concrete.addEventListener('dispose', released);
  boxes.dispose();
  expect(released).toHaveBeenCalledTimes(1);
  expect(boxes.get([8, 4, 12], true)).not.toBe(concrete);
  boxes.dispose();
});
