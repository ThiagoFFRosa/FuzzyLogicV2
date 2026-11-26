import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  Group,
  MathUtils,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
} from 'three';
import type { SpriteMaterial } from 'three';
import { SUPERVISOR_MODES } from '../../../lib/supervisor';
import { Surface, useEmissionTexture } from './FactoryMaterials';
import { flange, lathe, supervisorBatch } from './supervisorGeometry';

export interface SupervisorMotion {
  yaw: number;
  pitch: number;
  aperture: number;
  blink: number;
  energy: number;
  irritation: number;
}

const IRRITATED_TINT = new Color('#fa352f');
const IRRITATED_HOT = new Color('#ff946e');

const lensVertex = `
  varying vec2 vLensUv;
  #include <fog_pars_vertex>
  void main() {
    vLensUv = uv * 2.0 - 1.0;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const lensFragment = `
  uniform vec3 tint;
  uniform vec3 hot;
  uniform vec2 axis;
  uniform float aperture;
  uniform float shutter;
  uniform float energy;
  uniform float amber;
  varying vec2 vLensUv;
  #include <fog_pars_fragment>

  float line(float radius, float center, float width) {
    return 1.0 - smoothstep(width * 0.4, width, abs(radius - center));
  }

  void main() {
    vec2 face = vLensUv;
    vec2 pupil = face - axis;
    float r = length(face);
    float eye = length(pupil);
    float angle = atan(face.y, face.x);
    float ring = line(r, 0.91, 0.024) * 0.21 + line(r, 0.68, 0.019) * 0.09;
    float tick = pow(abs(cos(angle * 12.0)), 18.0) * line(r, 0.82, 0.044);
    vec3 color = vec3(0.011, 0.024, 0.029);
    color += tint * (ring + tick * mix(0.11, 0.23, amber));
    color += vec3(0.035, 0.048, 0.045) * smoothstep(0.05, 0.82, face.y) * (1.0 - r);
    float slit = 1.0 - smoothstep(shutter * 0.51, shutter * 0.51 + 0.08, abs(pupil.y + 0.07 * pupil.x));
    float iris = 1.0 - smoothstep(aperture * 0.66, aperture, eye);
    float bloom = exp(-eye * eye / (aperture * aperture * 1.24));
    float center = 1.0 - smoothstep(aperture * 0.16, aperture * 0.53, eye);
    float spark = line(eye, aperture * 0.82, 0.019) * (0.39 + 0.21 * cos(atan(pupil.y, pupil.x) * 3.0));
    color += (tint * (iris * 1.18 + bloom * 0.36 + spark) + hot * center * 1.78) * slit * energy;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function SupervisorEye({
  motion,
  amber,
  animate,
}: {
  motion: RefObject<SupervisorMotion>;
  amber: boolean;
  animate: boolean;
}) {
  const pivot = useRef<Group>(null);
  const halo = useRef<SpriteMaterial>(null);
  const haloTexture = useEmissionTexture();
  const mode = SUPERVISOR_MODES[amber ? 'amber' : 'blue'];
  const tint = useMemo(() => new Color(mode.tint), [mode]);
  const hot = useMemo(() => new Color(mode.hot), [mode]);
  const targetTint = useMemo(() => new Color(), []);
  const targetHot = useMemo(() => new Color(), []);
  const housing = useMemo(
    () =>
      supervisorBatch([
        lathe(
          [
            [0.72, -0.13],
            [0.793, -0.1],
            [0.8, -0.04],
            [0.78, 0.008],
            [0.716, 0.012],
            [0.69, -0.031],
            [0.691, -0.102],
            [0.73, -0.13],
          ],
          '#21393c',
          40,
        ),
        flange(0.716, 0.019, 0.014, '#628181'),
      ]),
    [],
  );
  const lens = useMemo(
    () =>
      new ShaderMaterial({
        fog: true,
        vertexShader: lensVertex,
        fragmentShader: lensFragment,
        uniforms: {
          ...UniformsUtils.clone(UniformsLib.fog),
          tint: { value: new Color(SUPERVISOR_MODES.blue.tint) },
          hot: { value: new Color(SUPERVISOR_MODES.blue.hot) },
          aperture: { value: SUPERVISOR_MODES.blue.aperture },
          axis: { value: new Vector2() },
          energy: { value: 1 },
          shutter: { value: 1 },
          amber: { value: 0 },
        },
      }),
    [],
  );
  useEffect(
    () => () => {
      housing.dispose();
      lens.dispose();
    },
    [housing, lens],
  );

  useFrame((_, delta) => {
    const pose = motion.current;
    if (pivot.current) pivot.current.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
    const blend = animate ? 1 - Math.exp(-7.2 * Math.min(delta, 0.07)) : 1;
    const { uniforms } = lens;
    uniforms.tint.value.lerp(targetTint.copy(tint).lerp(IRRITATED_TINT, pose.irritation), blend);
    uniforms.hot.value.lerp(targetHot.copy(hot).lerp(IRRITATED_HOT, pose.irritation), blend);
    uniforms.amber.value = MathUtils.lerp(uniforms.amber.value, Number(amber), blend);
    uniforms.axis.value.set(pose.yaw * 0.71, -pose.pitch * 0.64);
    uniforms.aperture.value = pose.aperture;
    uniforms.shutter.value = pose.blink;
    uniforms.energy.value = pose.energy;
    if (halo.current) {
      halo.current.color.copy(uniforms.tint.value);
      halo.current.opacity = 0.12 * pose.energy * pose.blink;
    }
  });

  return (
    <>
      <group ref={pivot} name="supervisor-eye" position={[0, 0, 0.363]}>
        <mesh geometry={housing} receiveShadow>
          <Surface kind="steel" color="#ffffff" vertexColors emissive="#243c3c" intensity={0.18} />
        </mesh>
        <mesh name="supervisor-lens" position={[0, 0, 0.01]} material={lens}>
          <circleGeometry args={[0.706, 36]} />
        </mesh>
        <sprite position={[0, 0, 0.15]} scale={[0.59, 0.59, 1]}>
          <spriteMaterial
            ref={halo}
            map={haloTexture}
            color={mode.tint}
            opacity={0.12}
            depthWrite={false}
            transparent
            blending={AdditiveBlending}
          />
        </sprite>
      </group>
      <mesh position={[0, -1.158, 0.475]}>
        <boxGeometry args={[0.21, 0.026, 0.026]} />
        <meshStandardMaterial color={mode.tint} emissive={mode.tint} emissiveIntensity={0.85} />
      </mesh>
    </>
  );
}
