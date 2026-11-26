import { useMemo, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { ExtrudeGeometry, Group, Vector3, MathUtils, Shape } from 'three';
import type { MeshStandardMaterial } from 'three';
import { projects } from '../../../data/projects';
import type { Locale } from '../../../lib/behavior';
import {
  BELT_SURFACE,
  DOCK_OCCLUSION,
  PROJECT_SLOTS,
  beltPosition,
  onExposedBelt,
} from '../../../lib/conveyor';
import { productLooks, projectTexture } from './sceneTextures';
import { Structure } from './FactoryEnvironment';
import { Surface, useEmissionTexture } from './FactoryMaterials';
import { MechanicalPlates } from './MechanicalParts';
import type { Plate } from './MechanicalParts';
import { CLOSED_CRATE, crateInspectionPose } from '../../../lib/inspection';
import type { InspectionSession, ProjectAnchor } from '../../../lib/inspection';

const CORNER_OFFSETS = [-0.5, 0.5] as const;

function beveledCratePanel(width: number, height: number, depth: number, bevel: number) {
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const shape = new Shape();
  shape.moveTo(-x, -y);
  shape.lineTo(x, -y);
  shape.lineTo(x, y);
  shape.lineTo(-x, y);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  return geometry;
}

export interface CrateProps {
  index: number;
  locale: Locale;
  travel: MutableRefObject<number>;
  inspection: InspectionSession | null;
  hovered: number | null;
  reduced: boolean;
  anchors: MutableRefObject<ProjectAnchor[]>;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  contactShadow: boolean;
  projectionRevision: MutableRefObject<number>;
}
export function ProjectCrate({
  index,
  locale,
  travel,
  inspection,
  hovered,
  reduced,
  anchors,
  onSelect,
  onHover,
  contactShadow,
  projectionRevision,
}: CrateProps) {
  const group = useRef<Group>(null),
    lid = useRef<Group>(null),
    face = useRef<Group>(null);
  const latches = useRef<(Group | null)[]>([]);
  const interior = useRef<MeshStandardMaterial>(null);
  const status = useRef<MeshStandardMaterial>(null);
  const pose = useRef(CLOSED_CRATE);
  const projected = useMemo(() => new Vector3(), []);
  const shadowMap = useEmissionTexture();
  const previousProjection = useRef({ x: NaN, width: 0, height: 0, revision: -1 });
  const look = productLooks[index];
  const [width, height, depth] = look.dimensions;
  const shell = useMemo(
    () => beveledCratePanel(width, height - 0.28, depth, 0.11).translate(0, -0.08, 0),
    [width, height, depth],
  );
  const tray = useMemo(() => {
    const rimY = height / 2 - 0.14;
    return [-1, 1].flatMap((side): Plate[] => [
      { at: [side * (width / 2 - 0.086), rimY, 0], size: [0.17, 0.16, depth], color: look.shell },
      {
        at: [0, rimY, side * (depth / 2 - 0.07)],
        size: [width - 0.17, 0.16, 0.15],
        color: look.shell,
      },
    ]);
  }, [width, height, depth, look.shell]);
  const cover = useMemo(
    () => beveledCratePanel(width + 0.12, 0.18, depth + 0.08, 0.055),
    [width, depth],
  );
  const texture = useMemo(() => projectTexture(projects[index], index, locale), [index, locale]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(
    () => () => {
      shell.dispose();
      cover.dispose();
    },
    [shell, cover],
  );
  const isSelected = inspection?.index === index;
  const highlight = isSelected || hovered === index;
  useFrame(({ camera, size }, delta) => {
    if (!group.current || !lid.current) return;
    const x = beltPosition(PROJECT_SLOTS[index], travel.current);
    group.current.position.set(x, BELT_SURFACE + (height - 0.12) / 2, 0);
    // The unrendered part of the loop lies beyond the dock mouths.
    group.current.scale.setScalar(Math.abs(x) < DOCK_OCCLUSION ? 1 : 0);
    if (isSelected && onExposedBelt(x))
      pose.current = crateInspectionPose(inspection, performance.now(), reduced);
    else if (pose.current !== CLOSED_CRATE) {
      const decay = (value: number) =>
        reduced || value < 0.007 ? 0 : MathUtils.damp(value, 0, 24, Math.min(delta, 0.12));
      const { lid, latches, face, light } = pose.current;
      pose.current =
        lid || latches || face || light
          ? { lid: decay(lid), latches: decay(latches), face: decay(face), light: decay(light) }
          : CLOSED_CRATE;
    }
    const current = pose.current;
    lid.current.rotation.x = -1.28 * current.lid;
    if (face.current) face.current.position.z = 0.18 * current.face;
    latches.current.forEach((latch) => {
      if (latch) latch.rotation.x = 0.82 * current.latches;
    });
    if (interior.current) interior.current.emissiveIntensity = 0.035 + current.light * 0.85;
    if (status.current)
      status.current.emissiveIntensity = 0.27 + (highlight ? 0.82 : 0) + current.light * 0.6;

    const last = previousProjection.current;
    if (
      last.x === x &&
      last.width === size.width &&
      last.height === size.height &&
      last.revision === projectionRevision.current
    )
      return;
    last.x = x;
    last.width = size.width;
    last.height = size.height;
    last.revision = projectionRevision.current;
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity,
      inDepth = false;
    for (const dx of CORNER_OFFSETS) {
      for (const dy of CORNER_OFFSETS) {
        for (const dz of CORNER_OFFSETS) {
          const point = projected
            .set(x + dx * width, BELT_SURFACE + (dy + 0.5) * height, dz * depth)
            .project(camera);
          inDepth ||= point.z >= -1 && point.z <= 1;
          const px = ((point.x + 1) * size.width) / 2;
          const py = ((1 - point.y) * size.height) / 2;
          left = Math.min(left, px);
          right = Math.max(right, px);
          top = Math.min(top, py);
          bottom = Math.max(bottom, py);
        }
      }
    }
    anchors.current[index] = {
      left,
      top,
      width: right - left,
      height: bottom - top,
      viewportWidth: size.width,
      viewportHeight: size.height,
      visible:
        inDepth &&
        onExposedBelt(x) &&
        (left + right) / 2 > 0 &&
        (left + right) / 2 < size.width &&
        top < size.height &&
        bottom > 0,
    };
  });
  const select = (e: ThreeEvent<MouseEvent>) => {
    if (!onExposedBelt(e.point.x)) return;
    e.stopPropagation();
    onSelect(index);
  };
  return (
    <group
      ref={group}
      name={`project-crate-${index}`}
      onClick={select}
      onPointerOver={(e) => {
        if (!onExposedBelt(e.point.x) || e.pointerType === 'touch' || inspection) return;
        e.stopPropagation();
        onHover(index);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = '';
      }}
    >
      <mesh geometry={shell} castShadow receiveShadow>
        <Surface kind={index === 2 ? 'plastic' : 'wornPaint'} color={look.shell} />
      </mesh>
      {contactShadow && (
        <mesh
          position={[0, 0.012 - (height - 0.12) / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => undefined}
        >
          <planeGeometry args={[width * 1.6, depth * 1.55]} />
          <meshBasicMaterial
            map={shadowMap}
            color="#07100e"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      )}
      <MechanicalPlates plates={tray} kind={index === 2 ? 'plastic' : 'wornPaint'} />
      <group ref={face} name="crate-identification-panel">
        <Structure
          position={[0, -0.015, depth / 2 + 0.01]}
          size={[width * 0.91, height * 0.9, 0.075]}
          color={look.ink}
        />
        <mesh position={[0, -0.015, depth / 2 + 0.05]}>
          <planeGeometry args={[width * 0.88, height * 0.86]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
      <group ref={lid} position={[0, height / 2, -depth / 2]}>
        <mesh position={[0, 0, depth / 2]} geometry={cover} castShadow>
          <Surface kind={index === 2 ? 'plastic' : 'wornPaint'} color={look.shell} />
        </mesh>
        <Structure
          position={[0, 0.1, depth / 2]}
          size={[width * 0.64, 0.06, 0.08]}
          color={highlight ? look.accent : '#50605b'}
        />
        <Structure
          position={[0, 0.13, depth * 0.68]}
          size={[width * 0.36, 0.09, 0.105]}
          color={look.accent}
        />
      </group>
      {[-1, 1].map((side, latchIndex) => (
        <group key={side}>
          <Structure
            position={[side * (width / 2 - 0.1), 0, depth / 2 + 0.055]}
            size={[0.12, height, 0.1]}
            color="#69766b"
          />
          <Structure
            position={[side * (width / 2 + 0.04), height * 0.15, 0]}
            size={[0.12, 0.15, depth * 0.52]}
            color="#4e5c54"
          />
          <mesh
            position={[side * width * 0.3, height / 2, -depth / 2 - 0.038]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.088, 0.088, 0.34, 8]} />
            <Surface kind="steel" color="#617571" />
          </mesh>
          <group
            ref={(piece) => {
              latches.current[latchIndex] = piece;
            }}
            position={[side * width * 0.42, height * 0.464, depth / 2 + 0.105]}
            name="crate-latch"
          >
            <Structure position={[0, -0.12, 0]} size={[0.14, 0.27, 0.09]} color="#65736a" />
            <Structure
              position={[0, -0.19, 0.028]}
              size={[0.105, 0.045, 0.053]}
              color={look.accent}
            />
          </group>
        </group>
      ))}
      <mesh position={[0, height / 2 - 0.18, 0]}>
        <boxGeometry args={[width * 0.74, 0.06, depth * 0.74]} />
        <meshStandardMaterial
          ref={interior}
          color={look.ink}
          emissive={look.accent}
          emissiveIntensity={isSelected ? 0.55 : 0.04}
        />
      </mesh>
      <mesh position={[width * 0.34, -height * 0.37, depth / 2 + 0.09]}>
        <boxGeometry args={[0.18, 0.1, 0.04]} />
        <meshStandardMaterial
          ref={status}
          color={look.accent}
          emissive={look.accent}
          emissiveIntensity={highlight ? 2 : 0.3}
        />
      </mesh>
      {index === 2 && (
        <Structure position={[0, height / 2 + 0.16, 0]} size={[0.9, 0.16, 0.5]} color="#293a3c" />
      )}
      {index === 3 &&
        [-0.6, 0, 0.6].map((x) => (
          <Structure
            key={x}
            position={[x, height / 2 + 0.12, 0]}
            size={[0.22, 0.1, 0.22]}
            color="#b9d19b"
          />
        ))}
    </group>
  );
}
