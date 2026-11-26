export const BELT_LENGTH = 40;
export const PROJECT_SLOTS = [-12.5, -6.5, 0, 7.5, 16] as const;
export const DOCK_MOUTH = 15.5;
// Keep the first and last visible frames behind the internal dock shrouds.
export const DOCK_OCCLUSION = 19.85;
export const BELT_SURFACE = 0.905;
export const ROLLER_RADIUS = 0.175;
export const SCANNER_X = 3.6;
export const DAMAGED_TURRET_SLOT = 12;

export function rollerAngle(travel: number) {
  return -(travel / ROLLER_RADIUS) % (2 * Math.PI);
}

export function approachBeltSpeed(speed: number, target: number, delta: number) {
  const next = target + (speed - target) * Math.exp(-15 * Math.min(Math.max(delta, 0), 0.05));
  return Math.abs(next - target) < 0.008 ? target : next;
}

export function onExposedBelt(x: number) {
  return Math.abs(x) < DOCK_MOUTH;
}
export function crossedOnBelt(slot: number, previous: number, current: number, marker: number) {
  if (current <= previous) return false;
  const from = beltPosition(slot, previous);
  const to = beltPosition(slot, current);
  return from <= to ? from < marker && to >= marker : from < marker || to >= marker;
}
export function beltPosition(slot: number, travel: number): number {
  return ((((slot + travel + 20) % BELT_LENGTH) + BELT_LENGTH) % BELT_LENGTH) - 20;
}
export function advanceBelt(travel: number, delta: number, running: boolean, speed = 1): number {
  return running ? travel + Math.min(Math.max(delta, 0), 0.05) * 0.72 * speed : travel;
}
