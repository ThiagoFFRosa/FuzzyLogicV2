import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide } from 'three';
import type { Mesh, MeshStandardMaterial, PointLight, ShaderMaterial, SpriteMaterial } from 'three';
import {
  DAMAGED_TURRET_SLOT,
  PROJECT_SLOTS,
  SCANNER_X,
  crossedOnBelt,
} from '../../../lib/conveyor';
import { Structure } from './FactoryEnvironment';
import { IndustrialCable, MechanicalPlates } from './MechanicalParts';
import type { Plate } from './MechanicalParts';
import { useEmissionTexture } from './FactoryMaterials';

const SCAN_SECONDS = 0.4;
const RESULT_SECONDS = 0.16;
const SCAN_SLOTS = [...PROJECT_SLOTS, DAMAGED_TURRET_SLOT];
const SENSOR_PLATES = [-1, 1].flatMap((side): Plate[] => [
  { at: [0, 1.35, side * 2.2], size: [0.52, 0.55, 0.36], color: '#4d6564' },
  { at: [0, 3.66, side * 2.2], size: [0.49, 0.44, 0.35], color: '#718180' },
  { at: [0.055, 2.83, side * 2.32], size: [0.32, 1.04, 0.17], color: '#34484a' },
  { at: [0, 0.55, side * 2.17], size: [0.68, 0.17, 0.33], color: '#475859' },
]);
const SENSOR_CABLE: [number, number, number][] = [
  [0.06, 2.65, 2.39],
  [0.29, 2.15, 2.41],
  [0.31, 0.76, 2.41],
  [0.71, 0.36, 2.25],
  [1.8, 0.35, 2.2],
];
const fieldVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const fieldFragment = `
  varying vec2 vUv;
  uniform float phase;
  uniform float pulse;
  void main() {
    float wave = sin(vUv.x * 67.0 + sin(vUv.y * 12.0 + phase) * 0.8 + phase * 2.0);
    float lines = pow(max(0.0, wave), 13.0);
    float edges = smoothstep(0.76, 0.99, abs(vUv.x * 2.0 - 1.0));
    float scan = exp(-36.0 * abs(vUv.y - (1.0 - pulse)));
    float flecks = pow(max(0.0, sin(vUv.x * 273.0 + phase) * sin(vUv.y * 185.0 - phase)), 25.0);
    float opacity = 0.025 + lines * 0.04 + edges * 0.22 + flecks * 0.16;
    if (pulse > 0.0) opacity += scan * 0.44;
    gl_FragColor = vec4(0.24, 0.85, 0.99, opacity);
    #include <colorspace_fragment>
  }`;

export function ConveyorScanner({
  travel,
  scanUntil,
  animate,
  amber,
}: {
  travel: RefObject<number>;
  scanUntil: RefObject<number>;
  animate: boolean;
  amber: boolean;
}) {
  const field = useMemo(() => ({ phase: { value: 0 }, pulse: { value: 0 } }), []);
  const fieldMaterial = useRef<ShaderMaterial>(null);
  const indicator = useRef<MeshStandardMaterial>(null);
  const indicatorHalo = useRef<SpriteMaterial>(null);
  const haloTexture = useEmissionTexture();
  const wash = useRef<PointLight>(null);
  const strip = useRef<Mesh>(null);
  const lastTravel = useRef(travel.current);
  const pulseAge = useRef(Infinity);
  const warning = useRef(false);
  const indicatorColor = useMemo(() => new Color(), []);
  const color = amber ? '#f5a656' : '#51d5f5';
  useFrame((_, delta) => {
    const previous = lastTravel.current;
    lastTravel.current = travel.current;
    if (!animate) pulseAge.current = Infinity;
    else {
      const index = SCAN_SLOTS.findIndex((slot) =>
        crossedOnBelt(slot, previous, travel.current, SCANNER_X),
      );
      if (index >= 0) {
        pulseAge.current = 0;
        scanUntil.current = performance.now() + 820;
        warning.current = index === SCAN_SLOTS.length - 1;
      } else {
        pulseAge.current += delta;
      }
      if (fieldMaterial.current)
        fieldMaterial.current.uniforms.phase.value += Math.min(delta, 0.05);
    }
    const progress = pulseAge.current / SCAN_SECONDS;
    const scanning = progress < 1;
    if (fieldMaterial.current) fieldMaterial.current.uniforms.pulse.value = scanning ? progress : 0;
    if (strip.current) {
      strip.current.visible = scanning;
      if (scanning) strip.current.position.y = 4.06 - progress * 2.95;
    }
    if (wash.current) wash.current.intensity = scanning ? 13 * Math.sin(Math.PI * progress) : 0;
    if (indicator.current) {
      const verified = !scanning && pulseAge.current < SCAN_SECONDS + RESULT_SECONDS;
      indicatorColor.set(verified ? (warning.current ? '#e89456' : '#99e7a6') : color);
      indicator.current.emissive.copy(indicatorColor);
      indicator.current.emissiveIntensity = scanning || verified ? 1.8 : 0.55;
      if (indicatorHalo.current) {
        indicatorHalo.current.color.copy(indicatorColor);
        indicatorHalo.current.opacity = scanning || verified ? 0.47 : 0.2;
      }
    }
  });
  return (
    <group position={[SCANNER_X, 0, 0]}>
      <MechanicalPlates plates={SENSOR_PLATES} kind="wornPaint" />
      <IndustrialCable points={SENSOR_CABLE} radius={0.041} />
      {[-2.15, 2.15].map((z) => (
        <group key={z}>
          <Structure
            position={[0, 2.6, z]}
            size={[0.26, 3.65, 0.24]}
            color="#384d50"
            kind="wornPaint"
            casts
          />
          <Structure position={[0, 0.72, z]} size={[0.58, 0.38, 0.35]} color="#65736a" casts />
          <mesh position={[0, 2.63, z * 0.945]}>
            <boxGeometry args={[0.075, 2.98, 0.075]} />
            <meshStandardMaterial color="#76c4c9" emissive="#318c9a" emissiveIntensity={0.62} />
          </mesh>
        </group>
      ))}
      <Structure
        position={[0, 4.4, 0]}
        size={[0.29, 0.22, 4.55]}
        color="#60716b"
        kind="steel"
        casts
      />
      <mesh position={[0.07, 4.39, 2.26]}>
        <boxGeometry args={[0.19, 0.085, 0.035]} />
        <meshStandardMaterial
          ref={indicator}
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
        />
      </mesh>
      <sprite position={[0.07, 4.39, 2.3]} scale={[0.65, 0.49, 1]}>
        <spriteMaterial
          ref={indicatorHalo}
          map={haloTexture}
          color={color}
          opacity={0.2}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </sprite>
      <group position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 2.6, 0]} renderOrder={2}>
          <planeGeometry args={[4.05, 3.25]} />
          <shaderMaterial
            ref={fieldMaterial}
            uniforms={field}
            vertexShader={fieldVertex}
            fragmentShader={fieldFragment}
            transparent
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={strip} visible={false} position={[0, 2.6, 0]}>
          <boxGeometry args={[4.02, 0.026, 0.026]} />
          <meshBasicMaterial color="#91efff" transparent opacity={0.68} />
        </mesh>
      </group>
      <pointLight
        name="scanner-wash"
        ref={wash}
        position={[0, 2.55, 0.8]}
        color="#59d9ef"
        intensity={0}
        distance={4.1}
      />
    </group>
  );
}
