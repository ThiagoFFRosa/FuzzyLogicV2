import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import { AdditiveBlending, Color, Group, MathUtils, Object3D, Vector3, Quaternion } from 'three';
import { BELT_SURFACE, DOCK_OCCLUSION, beltPosition, onExposedBelt } from '../../../lib/conveyor';
import { CharacterReaction } from '../../../lib/characterReaction';
import { Structure } from './FactoryEnvironment';
import { Surface, useEmissionTexture } from './FactoryMaterials';
import type {
  BufferGeometry,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  SpriteMaterial,
} from 'three';

export type TurretVariant = 'active' | 'sleeping' | 'damaged';
type Point = [number, number, number];

const UP = new Vector3(0, 1, 0);
const SPARK_POSITIONS = new Float32Array([-0.17, 0.24, 0.49, 0.04, 0.36, 0.55, 0.25, 0.19, 0.52]);

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
  interaction,
}: {
  variant: TurretVariant;
  animate?: boolean;
  detailed?: boolean;
  followPointer?: boolean;
  attention?: RefObject<number | null>;
  stationX?: number;
  ambient?: AmbientScheduler;
  phaseOffset?: number;
  interaction?: CharacterReaction;
}) {
  const head = useRef<Group>(null);
  const lens = useRef<MeshStandardMaterial>(null);
  const halo = useRef<SpriteMaterial>(null);
  const sparks = useRef<Points<BufferGeometry, PointsMaterial>>(null);
  const haloTexture = useEmissionTexture();
  const cursor = useRef({ x: 0, y: 0, at: -Infinity });
  const active = variant === 'active';
  const damaged = variant === 'damaged';
  const color = damaged ? '#a7a18c' : active ? '#d3d6c6' : '#b8b7a1';
  const jointY = active ? 1.12 : damaged ? 0.8 : 0.6;
  const idleEnergy = active ? 1.55 : damaged ? 0.42 : 0;

  useFrame(({ pointer, clock }, delta) => {
    const now = interaction ? performance.now() : 0;
    const phase = interaction?.phase(now);
    const age = interaction?.age(now) ?? Infinity;
    const overload = phase === 'overload';
    let roll = 0;
    let energy = idleEnergy;
    if (animate && active && head.current) {
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
      roll = Math.sin(time * 0.91) * 0.018;
    }
    if (animate && damaged) {
      const strength = ambient?.strength('turret') ?? 0;
      const progress = ambient?.progress('turret') ?? 0;
      energy = Math.max(0.06, idleEnergy + strength * Math.cos(progress * Math.PI * 3));
      roll = Math.sin(progress * Math.PI * 4) * strength * 0.12;
    }
    if (phase === 'alerted' || phase === 'warning') {
      const warning = phase === 'warning';
      const lift = animate ? 1 - MathUtils.smoothstep(age, 120, 630) : 0.6;
      const blink = animate && age < 185 ? 1 - 0.6 * Math.sin((Math.PI * age) / 185) : 1;
      energy = (idleEnergy + (warning ? 0.85 : 0.42) * lift) * blink;
      if (animate)
        roll += Math.sin(age * (warning ? 0.027 : 0.012)) * lift * (warning ? 0.12 : 0.048);
    }
    const slump =
      overload && animate
        ? MathUtils.smoothstep(age, 250, 650) * (1 - MathUtils.smoothstep(age, 930, 1360))
        : 0;
    if (overload) {
      energy = animate
        ? (idleEnergy + 0.92) * (1 - MathUtils.smoothstep(age, 150, 320)) +
          idleEnergy * MathUtils.smoothstep(age, 930, 1360)
        : idleEnergy * 0.18 + 0.12;
    }
    if (head.current) {
      if (!animate) head.current.rotation.y = 0;
      head.current.rotation.z = roll - slump * 0.42;
      head.current.position.y = -slump * 0.15;
    }
    if (lens.current) lens.current.emissiveIntensity = energy;
    if (halo.current) halo.current.opacity = Math.min(0.62, energy * (active ? 0.31 : 0.52));
    if (sparks.current) {
      sparks.current.visible = overload && animate && age >= 80 && age < 420;
      if (sparks.current.visible) {
        const travel = (age - 80) / 340;
        sparks.current.scale.setScalar(0.84 + travel * 0.52);
        sparks.current.material.opacity = 0.82 * Math.sin(Math.PI * travel);
      }
    }
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
        <group ref={head} name={`turret-head-${variant}`}>
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
              emissive={
                interaction && variant === 'sleeping'
                  ? '#c98a56'
                  : variant === 'sleeping'
                    ? '#000000'
                    : '#f07651'
              }
              emissiveIntensity={idleEnergy}
            />
          </mesh>
          {interaction && (
            <points
              ref={sparks}
              name={`turret-sparks-${variant}`}
              visible={false}
              raycast={() => undefined}
            >
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[SPARK_POSITIONS, 3]} />
              </bufferGeometry>
              <pointsMaterial color="#ffbc78" size={0.068} transparent depthWrite={false} />
            </points>
          )}
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
  interactive,
  busyUntil,
}: {
  variant: TurretVariant;
  slot?: number;
  station?: Point;
  travel: RefObject<number>;
  reduced: boolean;
  attention?: RefObject<number | null>;
  ambient?: AmbientScheduler;
  interactive: boolean;
  busyUntil: MutableRefObject<number>;
}) {
  const root = useRef<Group>(null);
  const [reaction] = useState(() => new CharacterReaction(660, 1400));
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(
    () => () => {
      clearTimeout(expiry.current);
      reaction.reset();
      if (reduced) invalidate();
    },
    [interactive, invalidate, reaction, reduced],
  );
  const click = (event: ThreeEvent<MouseEvent>) => {
    if (!root.current?.visible || (!station && !onExposedBelt(root.current.position.x))) return;
    event.stopPropagation();
    const now = performance.now();
    const phase = reaction.press(now, now >= busyUntil.current);
    if (!phase) return;
    if (phase === 'overload') busyUntil.current = reaction.endsAt;
    invalidate();
    if (reduced) {
      clearTimeout(expiry.current);
      expiry.current = setTimeout(invalidate, reaction.endsAt - now);
    }
  };
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
      onClick={interactive ? click : undefined}
    >
      <TurretModel
        variant={variant}
        animate={!reduced}
        followPointer
        attention={attention}
        ambient={ambient}
        stationX={station?.[0]}
        interaction={reaction}
      />
    </group>
  );
}
