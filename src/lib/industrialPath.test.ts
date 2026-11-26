import { expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import { createIndustrialPath, placeOnIndustrialPath, loopDistance } from './industrialPath';

const path = () =>
  createIndustrialPath([
    [0, 0, 0],
    [4, 0, 1],
    [7, 3, 3],
    [9, 3, 8],
  ]);

it('transports at equal arc-length intervals and wraps only at the end of the route', () => {
  const rail = path();
  const center = new Object3D();
  placeOnIndustrialPath(rail, 0, center);
  expect(center.position.toArray()).toEqual([0, 0, 0]);
  const positions = Array.from({ length: 31 }, (_, index) => {
    placeOnIndustrialPath(rail, (index * rail.getLength()) / 30, center);
    return center.position.clone();
  });
  for (let i = 1; i < positions.length; i++) {
    expect(positions[i].distanceTo(positions[i - 1])).toBeCloseTo(rail.getLength() / 30, 1);
  }
  expect(loopDistance(rail.getLength() + 0.3, rail.getLength())).toBeCloseTo(0.3);
});

it('keeps transported feet on the local slope and points the model along the tangent', () => {
  const rail = path();
  const carrier = new Object3D();
  const distance = rail.getLength() * 0.44;
  placeOnIndustrialPath(rail, distance, carrier);
  const forward = new Vector3(0, 0, 1).applyQuaternion(carrier.quaternion);
  const up = new Vector3(0, 1, 0).applyQuaternion(carrier.quaternion);
  expect(forward.dot(rail.getTangentAt(0.44))).toBeCloseTo(1);
  expect(forward.y).toBeGreaterThan(0.4);
  expect(up.dot(forward)).toBeCloseTo(0);
  expect(up.y).toBeGreaterThan(0.6);
});
