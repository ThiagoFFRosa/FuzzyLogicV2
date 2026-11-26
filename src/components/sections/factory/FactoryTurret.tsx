import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import { AdditiveBlending, Group, MathUtils } from 'three';
import { BELT_SURFACE, DOCK_OCCLUSION, beltPosition, onExposedBelt } from '../../../lib/conveyor';
import { CharacterReaction } from '../../../lib/characterReaction';
import { useEmissionTexture, useRobotGeometry } from './FactoryMaterials';
import { raisedLens } from './robotSkin';
import { TurretChassis, TurretLegs, TurretLensHousing, TurretPanelHinge } from './TurretGeometry';
import type { TurretVariant } from './TurretGeometry';
import type {
  BufferGeometry,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  SpriteMaterial,
} from 'three';

export type { TurretVariant } from './TurretGeometry';
type Point = [number, number, number];

const SPARK_POSITIONS = new Float32Array([-0.17, 0.24, 0.49, 0.04, 0.36, 0.55, 0.25, 0.19, 0.52]);

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
  const optic = useRef<Group>(null);
  const port = useRef<Group>(null);
  const starboard = useRef<Group>(null);
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

  const lensGeometry = useRobotGeometry(`turret-lens:${damaged}:${detailed}`, () =>
    raisedLens(damaged ? 0.11 : 0.122, 0.046, detailed ? 20 : 12),
  );

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
    if (optic.current) optic.current.rotation.y = -0.24 * (head.current?.rotation.y ?? 0);
    const panelYaw = active ? 0.23 : damaged ? 0.34 : -0.21;
    if (port.current) port.current.rotation.y = -panelYaw + slump * 0.15;
    if (starboard.current) starboard.current.rotation.y = panelYaw - slump * 0.15;
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

  return (
    <group name={`turret-model-${variant}`}>
      <TurretLegs variant={variant} detailed={detailed} />
      <group
        position={[damaged ? -0.13 : 0, jointY + 0.49, 0]}
        rotation={[active ? 0 : 0.19, 0, damaged ? 0.17 : 0]}
      >
        <group ref={head} name={`turret-head-${variant}`}>
          <TurretChassis damaged={damaged} detailed={detailed} />
          <TurretPanelHinge
            side={-1}
            hinge={port}
            variant={variant}
            detailed={detailed}
            color={color}
          />
          {!damaged && (
            <TurretPanelHinge
              side={1}
              hinge={starboard}
              variant={variant}
              detailed={detailed}
              color={color}
            />
          )}
          <group ref={optic} name="turret-optic-pivot" position={[0, 0.13, 0.42]}>
            <TurretLensHousing damaged={damaged} detailed={detailed} />
            <mesh name={`turret-lens-${variant}`} position={[0, 0, 0.059]} geometry={lensGeometry}>
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
          </group>
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
