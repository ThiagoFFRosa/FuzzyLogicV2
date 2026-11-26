import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

type Point = [number, number, number];
export type Part = { geometry: BufferGeometry; color: string };

export function supervisorBatch(parts: Part[]) {
  for (const { geometry, color } of parts) {
    const tint = new Color(color);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    const rgb = [tint.r, tint.g, tint.b];
    for (let i = 0; i < colors.length; i += 3) colors.set(rgb, i);
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  }
  const batch = mergeGeometries(parts.map(({ geometry }) => geometry));
  parts.forEach(({ geometry }) => geometry.dispose());
  return batch;
}

export function block(size: Point, position: Point, color: string, turn = 0): Part {
  return { geometry: new BoxGeometry(...size).rotateZ(turn).translate(...position), color };
}

export function beveledPlate(
  profile: [number, number][],
  depth: number,
  color: string,
  bevel = 0.025,
): Part {
  const shape = new Shape(profile.map(([x, y]) => new Vector2(x, y)));
  const source = new ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    steps: 1,
  }).translate(0, 0, -depth / 2 + bevel);
  const geometry = mergeVertices(source);
  source.dispose();
  return { geometry, color };
}

export function pivot(
  radius: number,
  depth: number,
  position: Point,
  color: string,
  sides = 16,
): Part {
  return {
    geometry: new CylinderGeometry(radius, radius, depth, sides)
      .rotateX(Math.PI / 2)
      .translate(...position),
    color,
  };
}

export function flange(
  radius: number,
  tube: number,
  z: number,
  color: string,
  arc = Math.PI * 2,
  turn = 0,
): Part {
  return {
    geometry: new TorusGeometry(radius, tube, 6, Math.ceil((24 * arc) / Math.PI), arc)
      .rotateZ(turn)
      .translate(0, 0, z),
    color,
  };
}

export function lathe(profile: [number, number][], color: string, segments = 48): Part {
  return {
    geometry: new LatheGeometry(
      profile.map(([r, z]) => new Vector2(r, z)),
      segments,
    ).rotateX(Math.PI / 2),
    color,
  };
}

export function hose(points: Point[], radius: number, color: string): Part {
  const path = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  return { geometry: new TubeGeometry(path, 14, radius, 6, false), color };
}
