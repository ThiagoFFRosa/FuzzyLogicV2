import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import type { Locale } from '../../../lib/behavior';
import { Float32BufferAttribute, LatheGeometry, Object3D, Vector2 } from 'three';
import type { MeshStandardMaterial, Points, SpotLight } from 'three';
import { MechanicalPlates } from './MechanicalParts';
import type { Plate } from './MechanicalParts';
import { Surface } from './FactoryMaterials';
import { FLUID_CIRCUITS } from './infrastructureLayout';
import { FLOOR_LEVEL, SERVICE_BAY } from './groundLayout';
import { canvasTexture } from './sceneTextures';

const { pallet, barrels, scrap } = SERVICE_BAY;
const PALLET_TOP = FLOOR_LEVEL + 0.14;

const BOXES: Plate[] = [
  { at: [pallet.x - 0.74, PALLET_TOP + 0.5, pallet.z], size: [1.62, 1, 1.38], color: '#697162' },
  {
    at: [pallet.x + 0.93, PALLET_TOP + 0.39, pallet.z + 0.07],
    size: [1.28, 0.78, 1.19],
    color: '#4a5851',
  },
  {
    at: [pallet.x - 0.63, PALLET_TOP + 1.27, pallet.z - 0.05],
    size: [1.2, 0.54, 1.08],
    color: '#818070',
  },
];

const CRATE_HARDWARE: Plate[] = [
  ...[-0.91, 0.91].map((offset): Plate => ({
    at: [pallet.x + offset, FLOOR_LEVEL + 0.065, pallet.z],
    size: [0.34, 0.13, 1.57],
    color: '#414940',
  })),
  { at: [pallet.x, FLOOR_LEVEL + 0.115, pallet.z], size: [3.5, 0.065, 1.58], color: '#5d5e4c' },
  ...BOXES.flatMap(({ at: [x, y, z], size: [w, h, d] }): Plate[] => [
    { at: [x, y + h * 0.45, z], size: [w + 0.035, 0.105, d + 0.04], color: '#3c4a42' },
    { at: [x, y - h * 0.43, z], size: [w + 0.03, 0.09, d + 0.035], color: '#48524a' },
    ...[-1, 1].map((side): Plate => ({
      at: [x + side * (w / 2 - 0.12), y, z + d / 2 + 0.023],
      size: [0.095, h * 0.79, 0.06],
      color: '#67736a',
    })),
  ]),
];

const LAMP_BRACKET: Plate[] = [
  { at: [0, 0.02, -0.69], size: [0.17, 0.14, 1.46], color: '#546058' },
  { at: [0, -0.16, -0.03], size: [0.58, 0.31, 0.45], color: '#484c3b' },
];

function ServiceLight({ compact }: { compact: boolean }) {
  const light = useRef<SpotLight>(null);
  useEffect(() => {
    const shadow = light.current?.shadow;
    if (!compact || !shadow?.map) return;
    shadow.map.dispose();
    shadow.map = null;
  }, [compact]);
  const target = useMemo(() => {
    const point = new Object3D();
    point.position.set(1.3, -3.38, 2.6);
    return point;
  }, []);
  return (
    <group position={[-16.73, 2.05, 4.47]}>
      <MechanicalPlates plates={LAMP_BRACKET} kind="wornPaint" />
      <mesh position={[0, -0.27, 0.17]} rotation={[-0.8, 0, 0]}>
        <planeGeometry args={[0.39, 0.12]} />
        <meshStandardMaterial color="#c6ba92" emissive="#c9ad77" emissiveIntensity={0.36} />
      </mesh>
      <primitive object={target} />
      <spotLight
        name="maintenance-service-light"
        ref={light}
        position={[0, -0.31, 0.24]}
        target={target}
        color="#d2c094"
        intensity={29}
        angle={0.62}
        penumbra={0.92}
        distance={7.3}
        castShadow={!compact}
        shadow-autoUpdate={false}
        shadow-needsUpdate
        shadow-mapSize={[256, 256]}
        shadow-camera-near={0.55}
        shadow-normalBias={0.025}
      />
    </group>
  );
}

function StoragePallet({ locale }: { locale: Locale }) {
  const stencil = useMemo(
    () =>
      canvasTexture(
        (ctx) => {
          ctx.fillStyle = '#b5b79e';
          ctx.font = '800 78px sans-serif';
          ctx.fillText('FUZZS', 19, 79);
          ctx.fillStyle = '#b1a283';
          ctx.fillRect(22, 92, 246, 2);
          ctx.font = '600 23px monospace';
          ctx.fillText(locale === 'pt' ? 'OFICINA 07' : 'SERVICE 07', 22, 124, 138);
          for (let i = 0; i < 8; i++) ctx.fillRect(170 + i * 9, 109, 2 + (i % 3), 16);
          ctx.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 135; i++)
            ctx.fillRect((i * 43) % 320, (i * 31) % 144, 1 + (i % 7), 1 + (i % 2));
        },
        320,
        144,
      ),
    [locale],
  );
  useEffect(() => () => stencil.dispose(), [stencil]);

  return (
    <group name="fuzzs-storage">
      <MechanicalPlates plates={BOXES} kind="wornPaint" castShadow />
      <MechanicalPlates plates={CRATE_HARDWARE} kind="steel" />
      {BOXES.map(({ at: [x, y, z], size: [w, h, d] }, index) => (
        <mesh key={x} position={[x, y - h * 0.12, z + d / 2 + 0.026]}>
          <planeGeometry args={[w * 0.75, w * 0.3375]} />
          <meshStandardMaterial
            map={stencil}
            alphaTest={0.42}
            color={index === 1 ? '#a9b3aa' : '#ddd9c0'}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

function FluidDrums({ locale }: { locale: Locale }) {
  const { drum, labels } = useMemo(() => {
    const profile = [
      [0, 0],
      [0.88, 0],
      [0.99, 0.03],
      [0.99, 0.1],
      [0.94, 0.12],
      [0.94, 0.26],
      [0.99, 0.27],
      [0.99, 0.32],
      [0.94, 0.33],
      [0.94, 0.66],
      [0.99, 0.67],
      [0.99, 0.72],
      [0.94, 0.73],
      [0.94, 0.89],
      [1, 0.91],
      [1, 0.98],
      [0.89, 1],
      [0, 1],
    ];
    const drum = new LatheGeometry(
      profile.map(([x, y]) => new Vector2(x, y)),
      18,
    );
    const colors = new Float32Array(drum.attributes.position.count * 3);
    for (let i = 0; i < drum.attributes.position.count; i++) {
      const step = i % profile.length;
      const ring =
        step <= 3 || step >= 14 || step === 6 || step === 7 || step === 10 || step === 11;
      const fade = ring ? 0.56 : 0.94 - ((i * 3) % 5) * 0.035;
      colors.fill(fade, i * 3, i * 3 + 3);
    }
    drum.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const labels = barrels.map(({ circuit }) =>
      canvasTexture(
        (ctx) => {
          ctx.fillStyle = '#242f2b';
          ctx.fillRect(0, 0, 256, 120);
          ctx.fillStyle = FLUID_CIRCUITS[circuit].color;
          ctx.fillRect(9, 10, 14, 100);
          ctx.fillStyle = '#c7c2aa';
          ctx.font = '700 52px monospace';
          ctx.fillText(FLUID_CIRCUITS[circuit].id, 35, 59);
          ctx.font = '600 23px monospace';
          ctx.fillText(locale === 'pt' ? 'RETORNO DE GEL' : 'GEL TRANSPORT', 35, 95, 195);
        },
        256,
        120,
      ),
    );
    return { drum, labels };
  }, [locale]);
  useEffect(
    () => () => {
      drum.dispose();
      labels.forEach((label) => label.dispose());
    },
    [drum, labels],
  );

  return (
    <group name="maintenance-drums">
      {barrels.map((barrel, index) => {
        const tipped = 'tipped' in barrel;
        const fluid = FLUID_CIRCUITS[barrel.circuit];
        return (
          <group
            key={barrel.x}
            position={[barrel.x, FLOOR_LEVEL + (tipped ? barrel.radius : 0), barrel.z]}
            rotation={[0, tipped ? 0.2 : -0.13, tipped ? -Math.PI / 2 : 0]}
          >
            <mesh
              geometry={drum}
              scale={[barrel.radius, 1.13, barrel.radius]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={fluid.color}
                vertexColors
                roughness={0.87}
                metalness={0.2}
              />
            </mesh>
            <mesh position={[0.15, 1.134, 0.105]}>
              <cylinderGeometry args={[0.075, 0.075, 0.034, 8]} />
              <Surface kind="steel" color="#778077" />
            </mesh>
            <mesh position={[0.02, 0.56, barrel.radius + 0.002]}>
              <planeGeometry args={[0.47, 0.22]} />
              <meshStandardMaterial map={labels[index]} roughness={0.89} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const DEBRIS: Plate[] = [
  { at: [-0.36, 0.085, 0.15], size: [0.9, 0.17, 0.23], color: '#4a5750', angle: 0.08 },
  { at: [0.03, 0.19, -0.36], size: [1.48, 0.13, 0.33], color: '#53564d' },
  { at: [1.07, 0.08, 0.4], size: [0.6, 0.07, 0.14], color: '#676a58', angle: 0.12 },
  { at: [1.43, 0.11, 0.53], size: [0.23, 0.15, 0.23], color: '#3e4b49' },
  { at: [-0.9, 0.065, 0.68], size: [0.44, 0.09, 0.42], color: '#777868' },
];

function BrokenTurretProp({ ambient, compact }: { ambient: AmbientScheduler; compact: boolean }) {
  const lamp = useRef<MeshStandardMaterial>(null);
  const sparks = useRef<Points>(null);
  const particlePositions = useMemo(() => new Float32BufferAttribute(new Float32Array(12), 3), []);
  useFrame(() => {
    if (!lamp.current || !sparks.current) return;
    const strength = ambient.strength('salvage');
    const age = ambient.progress('salvage');
    lamp.current.emissiveIntensity = 0.07 + strength * (0.72 + Math.sin(age * Math.PI * 3) * 0.24);
    sparks.current.visible = strength > 0.15 && age > 0.48 && age < 0.78 && !compact;
    if (!sparks.current.visible) return;
    const progress = (age - 0.48) / 0.3;
    for (let i = 0; i < 4; i++) {
      particlePositions.setXYZ(
        i,
        (-0.12 + i * 0.07) * progress,
        (0.42 - i * 0.065) * progress - 0.2 * progress ** 2,
        (0.04 + i * 0.05) * progress,
      );
    }
    particlePositions.needsUpdate = true;
  });
  return (
    <group
      name="salvage-turret"
      position={[scrap.x, FLOOR_LEVEL, scrap.z]}
      rotation={[0, -0.19, 0]}
    >
      <MechanicalPlates plates={DEBRIS} kind="steel" />
      <mesh
        position={[0.03, 0.38, 0.05]}
        rotation={[0, 0.17, -1.36]}
        scale={[0.39, 0.68, 0.37]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 14, 10]} />
        <Surface kind="rubber" color="#3f4e48" />
      </mesh>
      <mesh
        position={[-0.32, 0.4, 0.12]}
        rotation={[0, 0.24, -1.22]}
        scale={[0.23, 0.47, 0.33]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 12, 8]} />
        <Surface kind="ceramic" color="#93978a" />
      </mesh>
      <mesh
        position={[0.84, 0.19, -0.31]}
        rotation={[0, -0.24, -1.43]}
        scale={[0.17, 0.5, 0.32]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 12, 8]} />
        <Surface kind="ceramic" color="#727971" />
      </mesh>
      <mesh position={[0.12, 0.36, 0.401]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.095, 0.115, 0.052, 10]} />
        <Surface kind="steel" color="#758374" />
      </mesh>
      <mesh name="salvage-status-light" position={[0.12, 0.36, 0.432]}>
        <circleGeometry args={[0.064, 12]} />
        <meshStandardMaterial
          ref={lamp}
          color="#765144"
          emissive="#e39a59"
          emissiveIntensity={0.07}
        />
      </mesh>
      <points ref={sparks} position={[0.32, 0.36, 0.25]} visible={false} frustumCulled={false}>
        <bufferGeometry>
          <primitive object={particlePositions} attach="attributes-position" />
        </bufferGeometry>
        <pointsMaterial
          color="#b7925f"
          transparent
          opacity={0.62}
          depthWrite={false}
          size={0.041}
        />
      </points>
      {!compact && (
        <mesh
          position={[1.13, 0.2, 0.45]}
          rotation={[0.4, 0.91, -1.38]}
          scale={[0.12, 0.37, 0.23]}
          castShadow
        >
          <sphereGeometry args={[1, 10, 7]} />
          <Surface kind="ceramic" color="#7d8578" />
        </mesh>
      )}
    </group>
  );
}

function EmptyTurretHousing() {
  return (
    <group
      name="empty-turret-housing"
      position={[-12.68, FLOOR_LEVEL + 0.25, 5.68]}
      rotation={[0.22, -0.51, -1.49]}
    >
      <mesh scale={[0.29, 0.59, 0.3]} castShadow receiveShadow>
        <sphereGeometry args={[1, 14, 9, 0.48, 4.28]} />
        <Surface kind="ceramic" color="#848b7c" />
      </mesh>
      <mesh scale={[0.26, 0.55, 0.25]} rotation={[0, 0.3, 0]}>
        <sphereGeometry args={[1, 12, 8, 0, 3.6]} />
        <Surface kind="rubber" color="#25332e" />
      </mesh>
    </group>
  );
}

export function MaintenanceBay({
  ambient,
  locale,
  mobile,
  lowResolution,
}: {
  ambient: AmbientScheduler;
  locale: Locale;
  mobile: boolean;
  lowResolution: boolean;
}) {
  if (mobile) return null;
  return (
    <group name="left-maintenance-bay">
      <ServiceLight compact={lowResolution} />
      <StoragePallet locale={locale} />
      <FluidDrums locale={locale} />
      <BrokenTurretProp ambient={ambient} compact={lowResolution} />
      <EmptyTurretHousing />
    </group>
  );
}
