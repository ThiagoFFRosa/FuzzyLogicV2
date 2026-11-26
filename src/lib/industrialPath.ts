import { CatmullRomCurve3, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';

export type IndustrialPoint = [number, number, number];

const right = new Vector3();
const up = new Vector3();
const forward = new Vector3();
const basis = new Matrix4();

export function createIndustrialPath(points: IndustrialPoint[]) {
  const path = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  path.arcLengthDivisions = 512;
  return path;
}

export function loopDistance(distance: number, length: number) {
  return ((distance % length) + length) % length;
}

// Local X spans the conveyor, local Y is its surface normal and local Z follows travel.
export function placeOnIndustrialPath(path: CatmullRomCurve3, distance: number, object: Object3D) {
  const t = Math.min(1, Math.max(0, distance / path.getLength()));
  path.getPointAt(t, object.position);
  path.getTangentAt(t, forward);
  right.set(forward.z, 0, -forward.x);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  else right.normalize();
  up.crossVectors(forward, right);
  object.quaternion.setFromRotationMatrix(basis.makeBasis(right, up, forward));
}
