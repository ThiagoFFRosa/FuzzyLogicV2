import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import type { CatmullRomCurve3 } from 'three';
import {
  createIndustrialPath,
  loopDistance,
  placeOnIndustrialPath,
} from '../../../lib/industrialPath';
import { Structure } from './FactoryEnvironment';
import { TurretModel } from './FactoryTurret';
import { MechanicalPlates } from './MechanicalParts';
import type { Plate } from './MechanicalParts';
import type { ConveyorRoute } from './infrastructureLayout';

const ROLLER_RADIUS = 0.11;
const CROSSWISE = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);

function trackRails(path: CatmullRomCurve3, width: number, segments: number) {
  const distance = path.getLength() / segments;
  const frame = new Object3D();
  const point = new Vector3();
  const vertices: number[] = [];
  const indices: number[] = [];

  const side = width / 2 + 0.085;
  const rails = [-side, side].map((center) => [center - 0.09, center + 0.09, -0.29, 0.04]);
  for (const [left, right, bottom, top] of [...rails, [-width / 2, width / 2, -0.25, -0.105]]) {
    const offset = vertices.length / 3;
    for (let step = 0; step <= segments; step++) {
      placeOnIndustrialPath(path, step * distance, frame);
      for (const [x, y] of [
        [left, bottom],
        [right, bottom],
        [right, top],
        [left, top],
      ]) {
        point.set(x, y, 0).applyQuaternion(frame.quaternion).add(frame.position);
        vertices.push(point.x, point.y, point.z);
      }
      if (step === 0) continue;
      for (let edge = 0; edge < 4; edge++) {
        const a = offset + (step - 1) * 4 + edge;
        const b = offset + (step - 1) * 4 + ((edge + 1) % 4);
        indices.push(a, b, a + 4, b, b + 4, a + 4);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function SecondaryConveyor({
  route,
  animate,
  compact,
}: {
  route: ConveyorRoute;
  animate: boolean;
  compact: boolean;
}) {
  const path = useMemo(() => createIndustrialPath(route.points), [route]);
  const length = path.getLength();
  const rollerCount = Math.ceil(length / (compact ? 0.6 : 0.4));
  const rails = useMemo(
    () => trackRails(path, route.width, rollerCount),
    [path, route.width, rollerCount],
  );
  useEffect(() => () => rails.dispose(), [rails]);
  const carriers = useRef<(Group | null)[]>([]);
  const frame = useRef(new Object3D());
  const elapsed = useRef(0);
  const cargo = compact ? route.cargo.slice(0, 1) : route.cargo;
  const brackets = useMemo(
    () =>
      [0.13, 0.3, 0.49, 0.68, 0.86].flatMap((at): Plate[] => {
        const { x, y, z } = path.getPointAt(at);
        return [
          {
            at: [x, y - 0.34, (z - 7.69) / 2],
            size: [0.24, 0.22, Math.abs(z + 7.69) + 0.45],
            color: '#52615a',
          },
          { at: [x, y - 0.54, -7.56], size: [0.48, 0.72, 0.18], color: '#465953' },
        ];
      }),
    [path],
  );
  const hoods = useMemo(
    () =>
      [0.095, 0.905].map((at) => {
        const root = new Object3D();
        placeOnIndustrialPath(path, at * length, root);
        return root;
      }),
    [path, length],
  );

  useFrame((_, delta) => {
    if (animate) elapsed.current += Math.min(delta, 0.15);
    cargo.forEach(({ start }, index) => {
      const carrier = carriers.current[index];
      if (!carrier) return;
      const distance = loopDistance(start * length + elapsed.current * route.speed, length);
      placeOnIndustrialPath(path, distance, carrier);
    });
  }, -1);

  return (
    <group name={route.id}>
      <mesh geometry={rails}>
        <meshStandardMaterial
          color="#576762"
          roughness={0.8}
          metalness={0.23}
          emissive="#2a3836"
          emissiveIntensity={0.48}
        />
      </mesh>
      <instancedMesh
        args={[undefined, undefined, rollerCount]}
        onUpdate={(mesh) => {
          const part = frame.current;
          const offset = new Vector3();
          for (let i = 0; i < rollerCount; i++) {
            placeOnIndustrialPath(path, ((i + 0.5) * length) / rollerCount, part);
            part.position.add(offset.set(0, -ROLLER_RADIUS, 0).applyQuaternion(part.quaternion));
            part.quaternion.multiply(CROSSWISE);
            part.updateMatrix();
            mesh.setMatrixAt(i, part.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <cylinderGeometry args={[ROLLER_RADIUS, ROLLER_RADIUS, route.width, 8]} />
        <meshStandardMaterial
          color="#52625e"
          roughness={0.67}
          metalness={0.38}
          emissive="#1c2525"
          emissiveIntensity={0.55}
        />
      </instancedMesh>
      <MechanicalPlates plates={brackets} kind="paint" receiveShadow={false} />
      {hoods.map(({ position, quaternion }, index) => (
        <group key={index} position={position} quaternion={quaternion}>
          <Structure
            position={[0, 1.13, 0]}
            size={[route.width + 0.73, 0.31, 2.15]}
            color="#465751"
          />
          {[-1, 1].map((side) => (
            <Structure
              key={side}
              position={[side * (route.width / 2 + 0.24), 0.4, 0]}
              size={[0.21, 1.35, 2.15]}
              color="#40534d"
            />
          ))}
        </group>
      ))}
      {cargo.map(({ variant }, index) => (
        <group
          key={index}
          ref={(group) => {
            carriers.current[index] = group;
          }}
          scale={compact ? 0.4 : 0.48}
        >
          <TurretModel
            variant={variant}
            animate={animate}
            detailed={false}
            phaseOffset={index * 3.7 + route.speed * 2.1}
          />
        </group>
      ))}
    </group>
  );
}
