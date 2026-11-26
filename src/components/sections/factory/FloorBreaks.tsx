import { useEffect, useMemo } from 'react';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
} from 'three';
import { FLOOR_BREAKS, FLOOR_LEVEL, brokenEdge } from './groundLayout';

type Point = [number, number];

function floorPath(path: Path, points: Point[]) {
  const [first, ...rest] = points;
  path.moveTo(first[0], -first[1]);
  rest.forEach(([x, z]) => path.lineTo(x, -z));
  path.closePath();
}

export function floorSurface(x: number, z: number, width: number, depth: number, tile = width) {
  const border = new Shape();
  floorPath(border, [
    [x, z],
    [x + width, z],
    [x + width, z + depth],
    [x, z + depth],
  ]);
  border.holes = FLOOR_BREAKS.map((patch) => {
    const hole = new Path();
    floorPath(hole, brokenEdge(patch));
    return hole;
  });
  const geometry = new ShapeGeometry(border);
  const { position, uv } = geometry.attributes;
  const uvDepth = tile === width ? depth : tile;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) - x) / tile, (position.getY(i) + z + depth) / uvDepth);
  }
  return geometry;
}

function breakGeometry() {
  const rock: number[] = [],
    tints: number[] = [];
  const grass: number[] = [],
    shades: number[] = [];
  const chip = new Color();
  const soil = new Color();
  const leaf = new Color();
  let seed = 93;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

  FLOOR_BREAKS.forEach((patch) => {
    const edge = brokenEdge(patch);
    const [cx, cz] = patch.center;
    const bottom = FLOOR_LEVEL - patch.depth;
    const shape = new Shape();
    floorPath(shape, edge);
    const bed = new ShapeGeometry(shape);
    const indices = bed.index!;
    const points = bed.attributes.position;
    for (let i = 0; i < indices.count; i++) {
      const index = indices.getX(i);
      rock.push(points.getX(index), bottom, -points.getY(index));
      soil.set(i % 3 === 0 ? '#4b4030' : '#373a29').multiplyScalar(0.84 + random() * 0.32);
      tints.push(soil.r, soil.g, soil.b);
    }
    bed.dispose();

    edge.forEach(([x, z], i) => {
      const [nextX, nextZ] = edge[(i + 1) % edge.length];
      const shelf = FLOOR_LEVEL - patch.depth * (0.42 + (i % 3) * 0.08);
      rock.push(
        x,
        FLOOR_LEVEL,
        z,
        nextX,
        FLOOR_LEVEL,
        nextZ,
        x,
        shelf,
        z,
        x,
        shelf,
        z,
        nextX,
        FLOOR_LEVEL,
        nextZ,
        nextX,
        shelf,
        nextZ,
        x,
        shelf,
        z,
        nextX,
        shelf,
        nextZ,
        x,
        bottom,
        z,
        x,
        bottom,
        z,
        nextX,
        shelf,
        nextZ,
        nextX,
        bottom,
        nextZ,
      );
      for (let vertex = 0; vertex < 12; vertex++) {
        chip.set(vertex < 6 ? '#6d7062' : '#403b2c').multiplyScalar(0.77 + random() * 0.31);
        tints.push(chip.r, chip.g, chip.b);
      }
    });

    for (let i = 0; i < patch.grass; i++) {
      const [ex, ez] = edge[(i * 7 + 1) % edge.length];
      const [nx, nz] = edge[(i * 7 + 2) % edge.length];
      const t = random();
      const inset = 0.59 + random() * 0.36;
      const x = cx + (ex + (nx - ex) * t - cx) * inset;
      const z = cz + (ez + (nz - ez) * t - cz) * inset;
      const angle = random() * Math.PI * 2;
      const width = 0.015 + random() * 0.039;
      const height = patch.depth + random() * 0.22;
      const dx = Math.cos(angle) * width;
      const dz = Math.sin(angle) * width;
      const bend = 0.025 + random() * 0.12;
      grass.push(
        x - dx,
        bottom + 0.025,
        z - dz,
        x + dx,
        bottom + 0.025,
        z + dz,
        x + Math.sin(angle) * bend,
        bottom + height,
        z + Math.cos(angle) * bend,
      );
      leaf.set(i % 3 === 0 ? '#778552' : '#536843');
      shades.push(
        leaf.r * 0.57,
        leaf.g * 0.57,
        leaf.b * 0.57,
        leaf.r * 0.7,
        leaf.g * 0.7,
        leaf.b * 0.7,
        leaf.r,
        leaf.g,
        leaf.b,
      );
    }
  });

  return [
    [rock, tints],
    [grass, shades],
  ].map(([vertices, colors]) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  });
}

export function FloorBreaks() {
  const [stone, blades] = useMemo(breakGeometry, []);
  useEffect(
    () => () => {
      stone.dispose();
      blades.dispose();
    },
    [stone, blades],
  );
  return (
    <group name="floor-breaks">
      <mesh geometry={stone} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.97} side={DoubleSide} />
      </mesh>
      <mesh geometry={blades} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} side={DoubleSide} />
      </mesh>
    </group>
  );
}
