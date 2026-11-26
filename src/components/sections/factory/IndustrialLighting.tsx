import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import type { FactoryQuality } from '../../../lib/factoryQuality';
import { shadowMapSize } from '../../../lib/factoryGraphics';
import type { ShadowQuality } from '../../../lib/factoryGraphics';
import { AdditiveBlending, Color, Object3D, Quaternion, Vector3 } from 'three';
import type {
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  ShaderMaterial,
  SpotLight,
  SpriteMaterial,
} from 'three';
import { Structure } from './FactoryEnvironment';
import { useEmissionTexture } from './FactoryMaterials';

type FixtureState = 'operational' | 'unstable' | 'off';

const BEAM_ANGLE = 0.56;
const LAMP_COLOR = '#ebeadb';
const TUBE_EMISSION = 2.2;
const HALO_OPACITY = 0.18;
const beamVertex = `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDepth;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vView = -view.xyz;
    vDepth = 1.0 - uv.y;
    gl_Position = projectionMatrix * view;
  }
`;
const beamFragment = `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDepth;
  uniform float power;
  void main() {
    float inside = smoothstep(0.05, 0.78, dot(normalize(vNormal), normalize(vView)));
    float falloff = smoothstep(0.015, 0.24, vDepth) * (1.0 - smoothstep(0.35, 1.0, vDepth));
    gl_FragColor = vec4(0.66, 0.71, 0.69, inside * falloff * power * 0.083);
    #include <colorspace_fragment>
  }
`;

function IndustrialLightFixture({
  x,
  state,
  ambient,
  intensity = 220,
  targetOffset = 0,
  shadowSize = 512,
  castShadows = true,
  illuminate = true,
  tightShadows = false,
  z = 2.05,
}: {
  x: number;
  state: FixtureState;
  ambient?: AmbientScheduler;
  intensity?: number;
  targetOffset?: number;
  shadowSize?: number;
  castShadows?: boolean;
  illuminate?: boolean;
  tightShadows?: boolean;
  z?: number;
}) {
  const tube = useRef<MeshStandardMaterial>(null);
  const light = useRef<SpotLight>(null);
  const halo = useRef<SpriteMaterial>(null);
  const beam = useRef<ShaderMaterial>(null);
  const haze = useEmissionTexture();
  const uniforms = useMemo(() => ({ power: { value: 1 } }), []);
  const origin = useMemo(() => new Vector3(0, -0.22, 0), []);
  const { target, rotation, height, center } = useMemo(() => {
    const target = new Object3D();
    target.position.set(targetOffset, -9.08, -z + 0.15);
    const path = target.position.clone().sub(origin);
    return {
      target,
      rotation: new Quaternion().setFromUnitVectors(
        new Vector3(0, -1, 0),
        path.clone().normalize(),
      ),
      height: path.length(),
      center: origin.clone().addScaledVector(path, 0.5),
    };
  }, [origin, targetOffset, z]);
  const enabled = state !== 'off';
  useLayoutEffect(() => {
    const shadow = light.current?.shadow;
    if (!shadow) return;
    shadow.camera.updateProjectionMatrix();
    if (shadow.map && (!castShadows || shadow.map.width !== shadowSize)) {
      shadow.map.dispose();
      shadow.map = null;
    }
    shadow.needsUpdate = castShadows;
  }, [castShadows, shadowSize, tightShadows, illuminate]);
  useFrame(() => {
    if (!ambient || !tube.current) return;
    const power = 1 - ambient.strength('lamp');
    tube.current.emissiveIntensity = TUBE_EMISSION * power;
    if (light.current) light.current.intensity = intensity * power;
    if (beam.current) beam.current.uniforms.power.value = power;
    if (halo.current) halo.current.opacity = HALO_OPACITY * power;
  });
  return (
    <group position={[x, 7.9, z]}>
      <Structure
        position={[0, 0.12, 0]}
        size={[3.05, 0.24, 0.67]}
        color="#323c3d"
        kind="wornPaint"
        casts
      />
      {[-1.08, 1.08].map((support) => (
        <Structure
          key={support}
          position={[support, 3.87, 0]}
          size={[0.035, 7.5, 0.035]}
          color="#394542"
          casts
        />
      ))}
      {[-0.16, 0.16].map((z, index) => (
        <mesh key={z} position={[0, -0.065, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.059, 0.059, 2.67, 8]} />
          <meshStandardMaterial
            ref={index === 0 ? tube : undefined}
            color={enabled ? '#dbe7df' : '#656e62'}
            emissive={enabled ? '#e1f6f0' : '#000000'}
            emissiveIntensity={
              enabled ? (state === 'unstable' && index === 1 ? 0.36 : TUBE_EMISSION) : 0
            }
            roughness={0.42}
          />
        </mesh>
      ))}
      {enabled && (
        <>
          {illuminate && (
            <>
              <primitive object={target} />
              <spotLight
                name={`fluorescent-${state}`}
                ref={light}
                target={target}
                position={origin}
                color={LAMP_COLOR}
                intensity={intensity}
                distance={14}
                angle={BEAM_ANGLE}
                penumbra={0.78}
                decay={2}
                castShadow={castShadows}
                shadow-mapSize={[shadowSize, shadowSize]}
                shadow-camera-near={tightShadows ? 1.25 : 0.5}
                shadow-normalBias={tightShadows ? 0.025 : 0.035}
                shadow-bias={tightShadows ? -0.00012 : -0.0002}
                shadow-radius={shadowSize === 512 ? 1.6 : 2.6}
              />
            </>
          )}
          <mesh position={center} quaternion={rotation} renderOrder={1}>
            <coneGeometry args={[height * Math.tan(BEAM_ANGLE), height, 32, 1, true]} />
            <shaderMaterial
              ref={beam}
              uniforms={uniforms}
              vertexShader={beamVertex}
              fragmentShader={beamFragment}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <sprite position={[0, -0.1, 0.22]} scale={[3.55, 0.62, 1]}>
            <spriteMaterial
              ref={halo}
              map={haze}
              color={LAMP_COLOR}
              opacity={HALO_OPACITY}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </sprite>
        </>
      )}
    </group>
  );
}

export function IndustrialLighting({
  compact,
  ambient,
  animate,
  amber,
  supervisorX,
  supervisorZ,
  quality,
  shadows,
}: {
  compact: boolean;
  ambient: AmbientScheduler;
  animate: boolean;
  amber: boolean;
  supervisorX: number;
  supervisorZ: number;
  quality: FactoryQuality;
  shadows: ShadowQuality;
}) {
  const maxMap = useThree((state) => state.gl.capabilities.maxTextureSize);
  const mainShadow = Math.min(maxMap, shadowMapSize(shadows, 'main', compact));
  const outerShadow = Math.min(maxMap, shadowMapSize(shadows, 'outer', compact));
  const low = quality === 'low';
  const distant = useRef<PointLight>(null);
  const reflection = useRef<MeshBasicMaterial>(null);
  const coreLight = useRef<PointLight>(null);
  const tintLights = useRef<(PointLight | null)[]>([]);
  const tintFills = useRef<(MeshBasicMaterial | null)[]>([]);
  const windowGlow = useRef<Object3D>(null);
  const color = amber ? '#eea257' : '#58bfe4';
  const coreColor = amber ? '#e8ceac' : '#c0dbe3';
  const targetTint = useMemo(() => new Color(color), [color]);
  const targetCore = useMemo(() => new Color(coreColor), [coreColor]);
  const initialTint = useRef(color);
  const initialCore = useRef(coreColor);
  const haze = useEmissionTexture();
  useFrame((_, delta) => {
    const blend = animate ? 1 - Math.exp(-10 * Math.min(delta, 0.16)) : 1;
    coreLight.current?.color.lerp(targetCore, blend);
    distant.current?.color.lerp(targetTint, blend);
    reflection.current?.color.lerp(targetTint, blend);
    for (const light of tintLights.current) light?.color.lerp(targetTint, blend);
    for (const fill of tintFills.current) fill?.color.lerp(targetTint, blend);
    const event = ambient.current;
    const strength = ambient.strength('window');
    if (distant.current) {
      distant.current.intensity = strength * 2.2;
      if (event?.id === 'window') distant.current.position.set(...event.target);
    }
    if (windowGlow.current) windowGlow.current.visible = strength > 0.001;
    if (reflection.current) reflection.current.opacity = strength;
  });
  return (
    <>
      <IndustrialLightFixture
        x={-12}
        state="operational"
        intensity={220}
        targetOffset={0.7}
        castShadows={!!outerShadow}
        shadowSize={outerShadow || 512}
        tightShadows={shadows === 'ultra'}
        illuminate={!low}
      />
      <IndustrialLightFixture
        x={-3}
        state="unstable"
        ambient={ambient}
        intensity={295}
        targetOffset={0.95}
        castShadows={!!mainShadow}
        shadowSize={mainShadow || 512}
        tightShadows={shadows === 'ultra'}
      />
      <IndustrialLightFixture
        x={6}
        state="operational"
        intensity={310}
        targetOffset={-1.25}
        castShadows={!!mainShadow}
        shadowSize={mainShadow || 512}
        tightShadows={shadows === 'ultra'}
      />
      <IndustrialLightFixture
        x={15}
        state="operational"
        intensity={205}
        targetOffset={-1.2}
        castShadows={!!outerShadow}
        shadowSize={outerShadow || 512}
        tightShadows={shadows === 'ultra'}
        illuminate={!low}
      />
      <IndustrialLightFixture x={18} z={-4.6} state="off" />
      <pointLight
        ref={coreLight}
        position={[supervisorX - 0.95, 7.15, supervisorZ + 2.7]}
        color={initialCore.current}
        intensity={17}
        distance={6.4}
      />
      {!low && (
        <>
          <pointLight
            ref={(light) => {
              tintLights.current[0] = light;
            }}
            position={[-7, 0, -5.4]}
            color={initialTint.current}
            intensity={9}
            distance={7}
          />
          <pointLight
            ref={(light) => {
              tintLights.current[1] = light;
            }}
            position={[11, 0.2, -6.2]}
            color={initialTint.current}
            intensity={12}
            distance={8}
          />
        </>
      )}
      {[-7, 11].map((x, index) => (
        <mesh key={x} position={[x, 1.35, -6.4]}>
          <planeGeometry args={[7.8, 6]} />
          <meshBasicMaterial
            ref={(fill) => {
              tintFills.current[index] = fill;
            }}
            map={haze}
            color={initialTint.current}
            opacity={0.09}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
      {!low && (
        <pointLight
          name="distant-event"
          ref={distant}
          position={[5, 11, -9.58]}
          color={initialTint.current}
          intensity={0}
          distance={3.2}
        >
          <mesh ref={windowGlow} visible={false}>
            <planeGeometry args={[3.8, 1.65]} />
            <meshBasicMaterial
              ref={reflection}
              map={haze}
              color={initialTint.current}
              opacity={0}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </pointLight>
      )}
    </>
  );
}
