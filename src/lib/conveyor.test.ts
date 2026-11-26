import { it, expect } from 'vitest';
import {
  beltPosition,
  crossedOnBelt,
  DAMAGED_TURRET_SLOT,
  SCANNER_X,
  advanceBelt,
  PROJECT_SLOTS,
  onExposedBelt,
  DOCK_OCCLUSION,
  approachBeltSpeed,
  rollerAngle,
} from './conveyor';
it('all products travel together from left to right and wrap at the exit', () => {
  for (const slot of PROJECT_SLOTS) {
    expect(beltPosition(slot, 1)).toBeGreaterThanOrEqual(-20);
    expect(beltPosition(slot, 1)).toBeLessThan(20);
  }
  expect(beltPosition(-8, 2) - beltPosition(-8, 1)).toBeCloseTo(1);
  expect(beltPosition(8, 2) - beltPosition(8, 1)).toBeCloseTo(1);
  expect(beltPosition(19, 2)).toBe(-19);
});
it('detects one arrival at the scanner for every moving slot per circuit', () => {
  for (const slot of [...PROJECT_SLOTS, DAMAGED_TURRET_SLOT]) {
    const crossings = Array.from({ length: 400 }, (_, frame) => frame / 10).filter((travel) =>
      crossedOnBelt(slot, travel, travel + 0.1, SCANNER_X),
    );
    expect(crossings).toHaveLength(1);
    expect(beltPosition(slot, crossings[0])).toBeLessThan(SCANNER_X);
    expect(crossedOnBelt(slot, crossings[0], crossings[0], SCANNER_X)).toBe(false);
  }
  expect(crossedOnBelt(19.9, 0, 0.2, SCANNER_X)).toBe(false);
});
it('wraps from one covered dock to the other outside the inspection line', () => {
  const exiting = beltPosition(19.9, 0);
  const entering = beltPosition(19.9, 0.2);
  expect(exiting).toBeGreaterThan(DOCK_OCCLUSION);
  expect(entering).toBeLessThan(-DOCK_OCCLUSION);
  expect(onExposedBelt(exiting)).toBe(false);
  expect(onExposedBelt(entering)).toBe(false);
  expect(onExposedBelt(2)).toBe(true);
});
it('pause and reduced motion stop the line and long frames do not jump', () => {
  expect(advanceBelt(3, 1, false)).toBe(3);
  expect(advanceBelt(3, 100, true)).toBeLessThan(3.1);
  expect(advanceBelt(3, 0.016, true, 0.2)).toBeLessThan(advanceBelt(3, 0.016, true));
});

it('brakes the shared drive to rest and resumes from rest', () => {
  const braking = approachBeltSpeed(1, 0, 0.016);
  expect(braking).toBeGreaterThan(0);
  expect(braking).toBeLessThan(1);
  let stopped = braking;
  for (let i = 0; i < 30; i++) stopped = approachBeltSpeed(stopped, 0, 0.016);
  expect(stopped).toBe(0);
  const restarting = approachBeltSpeed(stopped, 1, 0.016);
  const movement = advanceBelt(0, 0.016, true, restarting);
  expect(movement).toBeGreaterThan(0);
  expect(rollerAngle(movement)).toBeLessThan(0);
});
