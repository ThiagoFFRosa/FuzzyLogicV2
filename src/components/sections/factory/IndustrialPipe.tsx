import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import {
  Color,
  Float32BufferAttribute,
  FrontSide,
  Object3D,
  Quaternion,
  ShaderMaterial,
  TubeGeometry,
  UniformsUtils,
  UniformsLib,
  Vector3,
} from 'three';
import { createIndustrialPath } from '../../../lib/industrialPath';
import { Structure } from './FactoryEnvironment';
import { Surface } from './FactoryMaterials';
import { canvasTexture } from './sceneTextures';
import type { FluidCircuit } from './infrastructureLayout';

const PIPE_AXIS = new Vector3(0, 1, 0);
const vertexShader = `
  varying vec2 pipeUv;
  varying vec3 vNormal;
  varying vec3 vEye;
  #include <fog_pars_vertex>
  void main() {
    pipeUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vEye = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = `
  uniform vec3 tint;
  uniform float travel;
  uniform float pipeLength;
  uniform float density;
  uniform float emission;
  varying vec2 pipeUv;
  varying vec3 vNormal;
  varying vec3 vEye;
  #include <fog_pars_fragment>
  void main() {
    float direction = pipeUv.x * pipeLength - travel;
    float roll = pipeUv.y * 6.2831853;
    #ifdef COMPACT_GEL
    float ripple = sin(direction * 6.0 + roll);
    vec3 liquid = tint * (0.59 + ripple * (1.35 - density) * 0.23 + emission * 0.35);
    #else
    float ripples = sin(direction * 8.1 + sin(roll * 2.0) * 1.7);
    float folds = sin(direction * 2.2 + cos(roll * 3.0) * 1.35);
    float bubbles = smoothstep(0.85, 0.99, cos(direction * 5.4 + 0.6 * sin(direction)))
      * smoothstep(0.7, 0.99, cos(roll * 3.0 + direction * 1.25));
    float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vEye))), 2.0);
    float current = 0.57 + (0.19 * ripples + 0.16 * folds) * (1.35 - density);
    vec3 liquid = tint * (current + emission * (0.29 + 0.21 * folds));
    liquid += mix(tint, vec3(0.76), 0.36) * (edge * 0.18 + bubbles * (1.05 - density) * 0.42);
    #endif
    gl_FragColor = vec4(liquid, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function FluidPump({ circuit, compact }: { circuit: FluidCircuit; compact: boolean }) {
  const radius = circuit.radius;
  const label = useMemo(
    () =>
      compact
        ? null
        : canvasTexture(
            (ctx) => {
              ctx.fillStyle = '#202a29';
              ctx.fillRect(0, 0, 256, 80);
              ctx.fillStyle = circuit.color;
              ctx.fillRect(10, 11, 18, 58);
              ctx.fillStyle = '#c4ccbd';
              ctx.font = '600 39px sans-serif';
              ctx.textBaseline = 'middle';
              ctx.fillText(circuit.id, 45, 41);
            },
            256,
            80,
          ),
    [circuit, compact],
  );
  useEffect(() => () => label?.dispose(), [label]);

  return (
    <>
      <mesh position={circuit.pump}>
        <cylinderGeometry args={[radius * 1.48, radius * 1.48, 0.67, 12]} />
        <Surface kind="wornPaint" color={circuit.paint} />
      </mesh>
      <group position={circuit.gauge}>
        <Structure position={[0.74, -0.51, -0.27]} size={[0.52, 1.05, 0.62]} color="#4e6058" />
        <Structure position={[0.45, -0.2, -0.18]} size={[0.98, 0.12, 0.14]} color="#697770" />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.16, 12]} />
          <Surface kind="steel" color="#687870" />
        </mesh>
        <mesh position={[0, 0, 0.09]}>
          <circleGeometry args={[0.122, 12]} />
          <meshStandardMaterial color="#a9b1a2" />
        </mesh>
        <Structure
          position={[0, 0.036, 0.097]}
          size={[0.02, 0.112, 0.025]}
          rotation={[0, 0, 0.65]}
          color="#1b302c"
        />
        {label && (
          <mesh position={[0.72, -0.1, 0.045]}>
            <planeGeometry args={[0.82, 0.256]} />
            <meshBasicMaterial map={label} />
          </mesh>
        )}
      </group>
    </>
  );
}

export function IndustrialPipe({
  circuit,
  clock,
  compact,
  ambient,
  sector,
}: {
  circuit: FluidCircuit;
  clock: RefObject<number>;
  compact: boolean;
  ambient: AmbientScheduler;
  sector: number;
}) {
  const { outer, inner, fluid, flangePoints, brackets, valve } = useMemo(() => {
    const path = createIndustrialPath(circuit.points);
    const segments = compact ? 56 : 104;
    const sides = compact ? 8 : 12;
    const [start, end] = circuit.glass.map((at) => Math.round(at * segments));
    const outer = new TubeGeometry(path, segments, circuit.radius, sides, false);
    const inner = new TubeGeometry(path, segments, circuit.radius * 0.79, sides, false);
    const surface = outer.attributes.normal;
    const color = new Float32Array(surface.count * 3);
    for (let index = 0; index < surface.count; index++) {
      const lighting =
        0.48 + 0.46 * Math.max(0, surface.getY(index)) + 0.06 * Math.max(0, surface.getZ(index));
      color.fill(lighting, index * 3, index * 3 + 3);
    }
    outer.setAttribute('color', new Float32BufferAttribute(color, 3));
    const stride = sides * 6;
    outer.clearGroups();
    outer.addGroup(0, start * stride, 0);
    outer.addGroup(start * stride, (end - start) * stride, 1);
    outer.addGroup(end * stride, (segments - end) * stride, 0);
    inner.setDrawRange(start * stride, (end - start) * stride);
    const fluid = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      defines: compact ? { COMPACT_GEL: 1 } : {},
      fog: true,
      uniforms: {
        ...UniformsUtils.clone(UniformsLib.fog),
        tint: { value: new Color(circuit.color) },
        travel: { value: 0 },
        pipeLength: { value: path.getLength() },
        density: { value: circuit.density },
        emission: { value: circuit.emission },
      },
    });
    const atStart = start / segments;
    const atEnd = end / segments;
    const flangePoints = [0.12, 0.28, atStart, atEnd, 0.76, 0.89].sort().map((at) => ({
      position: path.getPointAt(at),
      quaternion: new Quaternion().setFromUnitVectors(PIPE_AXIS, path.getTangentAt(at)),
    }));
    const brackets = [0.26, 0.73].map((at) => path.getPointAt(at));
    const valve = path.getPointAt(atStart - 0.06);
    return { outer, inner, fluid, flangePoints, brackets, valve };
  }, [circuit, compact]);

  useEffect(
    () => () => {
      outer.dispose();
      inner.dispose();
      fluid.dispose();
    },
    [outer, inner, fluid],
  );

  useFrame(() => {
    fluid.uniforms.travel.value = clock.current * circuit.speed;
    fluid.uniforms.emission.value =
      circuit.emission + (ambient.current?.sector === sector ? ambient.strength('gel') : 0);
  });

  return (
    <group name={circuit.id}>
      <mesh geometry={outer}>
        <meshStandardMaterial
          attach="material-0"
          vertexColors
          color={circuit.paint}
          roughness={0.72}
          metalness={0.35}
          emissive={circuit.paint}
          emissiveIntensity={0.15}
        />
        <meshStandardMaterial
          attach="material-1"
          color="#9daea8"
          roughness={0.23}
          metalness={0.25}
          opacity={circuit.opacity}
          transparent
          depthWrite={false}
          side={FrontSide}
        />
      </mesh>
      <mesh geometry={inner} material={fluid} />
      <instancedMesh
        args={[undefined, undefined, flangePoints.length]}
        onUpdate={(mesh) => {
          const collar = new Object3D();
          flangePoints.forEach(({ position, quaternion }, index) => {
            collar.position.copy(position);
            collar.quaternion.copy(quaternion);
            collar.updateMatrix();
            mesh.setMatrixAt(index, collar.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <cylinderGeometry
          args={[circuit.radius * 1.17, circuit.radius * 1.17, 0.18, 12, 1, true]}
        />
        <meshStandardMaterial
          color="#687973"
          roughness={0.63}
          metalness={0.42}
          emissive="#687973"
          emissiveIntensity={0.11}
        />
      </instancedMesh>
      {brackets.map(({ x, y, z }) => (
        <Structure
          key={x}
          position={[x, y - circuit.radius * 0.88, (z - 7.7) / 2]}
          size={[0.28, 0.17, Math.abs(z + 7.7) + 0.16]}
          color="#475853"
        />
      ))}
      {!compact && (
        <group position={valve}>
          <Structure
            position={[0, 0, circuit.radius * 0.65]}
            size={[0.42, 0.37, 0.44]}
            color="#63726b"
          />
          <mesh position={[0, 0, circuit.radius + 0.21]}>
            <torusGeometry args={[0.205, 0.036, 6, 12]} />
            <meshStandardMaterial color="#a28c57" roughness={0.75} />
          </mesh>
          <Structure
            position={[0, 0, circuit.radius + 0.21]}
            size={[0.41, 0.045, 0.055]}
            rotation={[0, 0, 0.58]}
            color="#9b875a"
          />
        </group>
      )}
      {circuit.id === 'GEL-W' && (
        <mesh position={[circuit.pump[0], 0.08, circuit.pump[2]]}>
          <capsuleGeometry args={[0.64, 1.25, 5, 12]} />
          <Surface kind="wornPaint" color="#627268" />
        </mesh>
      )}
      <FluidPump circuit={circuit} compact={compact} />
    </group>
  );
}
