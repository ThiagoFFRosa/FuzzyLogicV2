import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import { AdditiveBlending, Color, Group, MathUtils, Object3D, Vector3, Quaternion } from 'three';
import { BELT_SURFACE, DOCK_OCCLUSION, beltPosition } from '../../../lib/conveyor';
import { Structure } from './FactoryEnvironment';
import { Surface, useEmissionTexture } from './FactoryMaterials';
import type { MeshStandardMaterial, SpriteMaterial } from 'three';

export type TurretVariant = 'active' | 'sleeping' | 'damaged';
type Point = [number, number, number];

const UP = new Vector3(0, 1, 0);

function Strut({ from, to, size, color }: { from: Point; to: Point; size: number; color: string }) {
  const direction = new Vector3(...to).sub(new Vector3(...from));
  const center = new Vector3(...from).lerp(new Vector3(...to), 0.5);
  const orientation = new Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  return (
    <mesh position={center} quaternion={orientation}>
      <boxGeometry args={[size, direction.length(), size]} />
      <Surface kind="steel" color={color} />
    </mesh>
  );
}

export function TurretModel({
  variant,
  animate = false,
  detailed = true,
  followPointer = false,
  attention,
  stationX = 0,
  ambient,
  phaseOffset = 0,
}: {
  variant: TurretVariant;
  animate?: boolean;
  detailed?: boolean;
  followPointer?: boolean;
  attention?: RefObject<number | null>;
  stationX?: number;
  ambient?: AmbientScheduler;
  phaseOffset?: number;
}) {
  const head = useRef<Group>(null);
  const lens = useRef<MeshStandardMaterial>(null);
  const halo = useRef<SpriteMaterial>(null);
  const haloTexture = useEmissionTexture();
  const cursor = useRef({ x: 0, y: 0, at: -Infinity });
  const active = variant === 'active';
  const damaged = variant === 'damaged';
  const color = damaged ? '#a7a18c' : active ? '#d3d6c6' : '#b8b7a1';
  const jointY = active ? 1.12 : damaged ? 0.8 : 0.6;

  useFrame(({ pointer, clock }, delta) => {
    if (!animate) {
      if (head.current) head.current.rotation.set(0, 0, 0);
      if (damaged && lens.current) lens.current.emissiveIntensity = 0.42;
      if (halo.current) halo.current.opacity = active ? 0.48 : 0.22;
      return;
    }
    if (active && head.current) {
      const focus = attention?.current;
      const time = clock.elapsedTime + phaseOffset;
      const sample = cursor.current;
      if (followPointer && (sample.x !== pointer.x || sample.y !== pointer.y)) {
        sample.x = pointer.x;
        sample.y = pointer.y;
        sample.at = clock.elapsedTime;
      }
      const target =
        focus != null
          ? MathUtils.clamp((focus - stationX) * 0.08, -0.37, 0.37)
          : followPointer && clock.elapsedTime - sample.at < 1.9
            ? pointer.x * 0.35
            : Math.sin(time * 0.63) * 0.115;
      head.current.rotation.y = MathUtils.damp(
        head.current.rotation.y,
        target,
        4,
        Math.min(delta, 0.16),
      );
      head.current.rotation.z = Math.sin(time * 0.91) * 0.018;
    }
    if (!damaged || !lens.current) return;
    const strength = ambient?.strength('turret') ?? 0;
    const progress = ambient?.progress('turret') ?? 0;
    const intensity = Math.max(0.06, 0.42 + strength * Math.cos(progress * Math.PI * 3));
    if (head.current) head.current.rotation.z = Math.sin(progress * Math.PI * 4) * strength * 0.12;
    lens.current.emissiveIntensity = intensity;
    if (halo.current) halo.current.opacity = intensity * 0.52;
  });

  const feet: Point[] = [
    [-0.72, 0.07, 0.34],
    [0.72, 0.07, damaged ? 0.08 : 0.34],
    [0, 0.07, -0.69],
  ];
  const legs = feet.map((foot, index) => {
    const side = index === 0 ? -1 : 1;
    const hip: Point = index === 2 ? [0, jointY, -0.19] : [side * 0.34, jointY, 0.04];
    const knee: Point =
      index === 2
        ? [0, active ? 0.61 : 0.32, -0.57]
        : [side * (active ? 0.58 : 0.72), active ? 0.67 : 0.38, foot[2] - 0.08];
    return { hip, knee, foot };
  });
  return (
    <group name={`turret-model-${variant}`}>
      <instancedMesh
        args={[undefined, undefined, legs.length * 3]}
        receiveShadow={detailed}
        onUpdate={(mesh) => {
          const part = new Object3D();
          const start = new Vector3();
          const direction = new Vector3();
          const tint = new Color();
          legs.forEach(({ hip, knee, foot }, index) => {
            const segments = [
              [hip, knee, detailed ? 0.16 : 0.19, '#546963'],
              [knee, foot, 0.095, '#91a194'],
            ] as const;
            segments.forEach(([from, to, width, color], segment) => {
              start.set(...from);
              direction.set(...to).sub(start);
              part.position.copy(start).addScaledVector(direction, 0.5);
              part.scale.set(width, direction.length(), width);
              part.quaternion.setFromUnitVectors(UP, direction.normalize());
              part.updateMatrix();
              mesh.setMatrixAt(index * 3 + segment, part.matrix);
              mesh.setColorAt(index * 3 + segment, tint.set(color));
            });
            part.position.set(...foot);
            part.scale.set(0.23, 0.14, 0.3);
            part.quaternion.identity();
            part.updateMatrix();
            mesh.setMatrixAt(index * 3 + 2, part.matrix);
            mesh.setColorAt(index * 3 + 2, tint.set('#52615b'));
          });
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <Surface kind="steel" color="#ffffff" />
      </instancedMesh>
      {detailed &&
        legs.map(({ knee }, index) => (
          <mesh key={index} position={knee} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.19, 8]} />
            <Surface kind="steel" color="#425957" />
          </mesh>
        ))}
      <group
        position={[damaged ? -0.13 : 0, jointY + 0.49, 0]}
        rotation={[active ? 0 : 0.19, 0, damaged ? 0.17 : 0]}
      >
        <group ref={head}>
          <mesh castShadow={detailed} receiveShadow={detailed} scale={[0.47, 0.86, 0.39]}>
            <sphereGeometry args={[1, detailed ? 16 : 10, detailed ? 12 : 7]} />
            <Surface kind="plastic" color="#293c40" />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                side * (active ? 0.37 : 0.31) + (damaged && side > 0 ? 0.13 : 0),
                damaged && side > 0 ? -0.22 : 0.02,
                -0.024,
              ]}
              rotation={[0, side * 0.13, damaged && side > 0 ? -0.43 : side * 0.09]}
              scale={[0.28, damaged && side > 0 ? 0.48 : 0.86, 0.41]}
              castShadow={detailed}
            >
              <sphereGeometry args={[1, detailed ? 14 : 9, detailed ? 10 : 7]} />
              <Surface kind="ceramic" color={color} />
            </mesh>
          ))}
          <mesh position={[0, 0.13, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.19, 0.12, 12]} />
            <Surface kind="steel" color="#62726b" />
          </mesh>
          <mesh name={`turret-lens-${variant}`} position={[0, 0.13, 0.472]} scale={[1, 1, 0.38]}>
            <sphereGeometry args={[0.115, 10, 8]} />
            <meshStandardMaterial
              ref={lens}
              color={variant === 'sleeping' ? '#293c3b' : '#ed946d'}
              emissive={variant === 'sleeping' ? '#000000' : '#f07651'}
              emissiveIntensity={active ? 1.55 : damaged ? 0.42 : 0}
            />
          </mesh>
          {detailed && variant !== 'sleeping' && (
            <sprite position={[0, 0.13, 0.53]} scale={[0.47, 0.47, 1]}>
              <spriteMaterial
                ref={halo}
                map={haloTexture}
                color="#ff9166"
                opacity={active ? 0.48 : 0.22}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
              />
            </sprite>
          )}
          {detailed && (
            <>
              <Structure
                position={[-0.32, -0.28, 0.36]}
                size={[0.25, 0.065, 0.04]}
                color="#93866a"
              />
              {damaged && (
                <Strut
                  from={[0.23, 0.36, 0.17]}
                  to={[0.57, -0.17, 0.37]}
                  size={0.045}
                  color="#b58053"
                />
              )}
            </>
          )}
        </group>
      </group>
    </group>
  );
}

export function FactoryTurret({
  variant,
  slot = 0,
  station,
  travel,
  reduced,
  attention,
  ambient,
}: {
  variant: TurretVariant;
  slot?: number;
  station?: Point;
  travel: RefObject<number>;
  reduced: boolean;
  attention?: RefObject<number | null>;
  ambient?: AmbientScheduler;
}) {
  const root = useRef<Group>(null);
  useFrame(() => {
    if (!root.current || station) return;
    const x = beltPosition(slot, travel.current);
    root.current.position.x = x;
    root.current.visible = Math.abs(x) < DOCK_OCCLUSION;
  });
  return (
    <group
      ref={root}
      name={`factory-turret-${variant}`}
      position={station ?? [beltPosition(slot, travel.current), BELT_SURFACE, 0]}
      scale={0.85}
    >
      <TurretModel
        variant={variant}
        animate={!reduced}
        followPointer
        attention={attention}
        ambient={ambient}
        stationX={station?.[0]}
      />
    </group>
  );
}
