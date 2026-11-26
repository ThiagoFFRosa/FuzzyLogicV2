import { useMemo } from 'react';
import type { Ref } from 'react';
import { Quaternion, Vector3 } from 'three';
import type { Group } from 'three';
import { Surface, useRobotGeometry } from './FactoryMaterials';
import { curvedSkin } from './robotSkin';
import {
  beveledPlate,
  block,
  flange,
  hose,
  lathe,
  pivot,
  supervisorBatch,
} from './supervisorGeometry';
import type { Part } from './supervisorGeometry';

export type TurretVariant = 'active' | 'sleeping' | 'damaged';
type Point = [number, number, number];
type Joint = { from: Vector3; rotation: Quaternion; length: number };
const UP = new Vector3(0, 1, 0);

const SHELL = [
  [-0.77, 0.13, 0.17, -0.02],
  [-0.63, 0.35, 0.32, -0.04],
  [-0.38, 0.53, 0.43, -0.035],
  [-0.08, 0.62, 0.46, -0.025],
  [0.27, 0.635, 0.47, -0.025],
  [0.55, 0.54, 0.41, -0.04],
  [0.78, 0.34, 0.3, -0.055],
  [0.88, 0.14, 0.16, -0.07],
] as const;

export function TurretPanel({
  side,
  detailed,
  castShadow,
  color,
}: {
  side: -1 | 1;
  detailed: boolean;
  castShadow?: boolean;
  color: string;
}) {
  const geometry = useRobotGeometry(`turret-ceramic:${side}:${detailed}`, () => {
    const start = side === 1 ? -1.22 : Math.PI - 1.15;
    const end = side === 1 ? 1.15 : Math.PI + 1.22;
    const rows = detailed ? SHELL : SHELL.filter((_, index) => [0, 2, 4, 6, 7].includes(index));
    return curvedSkin(rows, start, end, detailed ? 9 : 5, 0.06).translate(
      -side * 0.29,
      -0.06,
      0.12,
    );
  });
  return (
    <mesh geometry={geometry} castShadow={castShadow} receiveShadow={detailed}>
      <Surface kind="ceramic" color={color} />
    </mesh>
  );
}

export function TurretPanelHinge({
  side,
  variant,
  detailed,
  hinge,
  color,
}: {
  side: -1 | 1;
  variant: TurretVariant;
  detailed: boolean;
  hinge: Ref<Group>;
  color: string;
}) {
  const yaw = side * (variant === 'active' ? 0.23 : variant === 'sleeping' ? -0.21 : 0.34);
  return (
    <group
      name={side === -1 ? 'turret-panel-port' : 'turret-panel-starboard'}
      ref={hinge}
      position={[side * 0.29, 0.06, -0.12]}
      rotation={[0, yaw, variant === 'damaged' ? 0.15 : 0]}
    >
      <TurretPanel side={side} detailed={detailed} castShadow={detailed} color={color} />
    </group>
  );
}

function chassisParts(damaged: boolean, detailed: boolean): Part[] {
  const main = lathe(
    [
      [0, -0.71],
      [0.2, -0.71],
      [0.29, -0.63],
      [0.37, -0.37],
      [0.38, 0.28],
      [0.32, 0.58],
      [0.19, 0.72],
      [0, 0.72],
    ],
    '#30423f',
    detailed ? 14 : 9,
  );
  main.geometry.rotateX(-Math.PI / 2).scale(0.94, 1, 0.96);
  const spine = beveledPlate(
    [
      [-0.27, -0.48],
      [-0.36, -0.17],
      [-0.34, 0.42],
      [-0.21, 0.64],
      [0.21, 0.64],
      [0.34, 0.42],
      [0.36, -0.17],
      [0.27, -0.48],
    ],
    0.105,
    '#53625a',
  );
  spine.geometry.translate(0, 0, -0.3);
  const parts = [
    main,
    spine,
    ...[-1, 1].flatMap((side) => [
      pivot(0.093, 0.27, [side * 0.31, 0.36, -0.03], '#70786b', 8),
      pivot(0.085, 0.23, [side * 0.31, -0.35, -0.07], '#69776e', 8),
      block([0.11, 0.65, 0.16], [side * 0.33, 0.02, -0.12], '#344844', side * 0.05),
    ]),
  ];
  for (let index = 0; index < (detailed ? 5 : 2); index++) {
    parts.push(block([0.34, 0.033, 0.037], [0, -0.29 + 0.11 * index, -0.36], '#202e2c'));
  }
  if (damaged) {
    parts.push(
      block([0.16, 0.47, 0.23], [0.37, 0.2, -0.015], '#516157', -0.18),
      pivot(0.095, 0.21, [0.42, 0.38, 0.16], '#9a835e', 8),
      hose(
        [
          [0.39, 0.48, -0.04],
          [0.54, 0.27, 0.17],
          [0.55, -0.05, 0.22],
          [0.73, -0.27, 0.14],
        ],
        0.024,
        '#aa7048',
      ),
      hose(
        [
          [0.38, -0.09, -0.11],
          [0.46, -0.3, 0.06],
          [0.61, -0.4, 0.07],
        ],
        0.019,
        '#6d776d',
      ),
    );
  }
  return parts;
}

export function TurretChassis({ damaged, detailed }: { damaged: boolean; detailed: boolean }) {
  const geometry = useRobotGeometry(`turret-chassis:${damaged}:${detailed}`, () =>
    supervisorBatch(chassisParts(damaged, detailed)),
  );
  return (
    <mesh
      name="turret-load-frame"
      geometry={geometry}
      castShadow={detailed}
      receiveShadow={detailed}
    >
      <Surface kind="wornPaint" color="#ffffff" vertexColors />
    </mesh>
  );
}

export function TurretLensHousing({ damaged, detailed }: { damaged: boolean; detailed: boolean }) {
  const geometry = useRobotGeometry(`turret-lens-housing:${damaged}:${detailed}`, () =>
    supervisorBatch([
      lathe(
        [
          [0.15, -0.105],
          [0.214, -0.105],
          [0.229, -0.05],
          [0.224, 0.075],
          [0.199, 0.109],
          [0.153, 0.109],
          [0.139, 0.071],
          [0.136, -0.02],
        ],
        '#53655b',
        detailed ? 20 : 12,
      ),
      flange(0.152, 0.014, 0.063, '#263332', damaged ? 5.12 : Math.PI * 2, 0.51),
      pivot(0.14, 0.07, [0, 0, -0.034], '#1b2928', 12),
    ]),
  );
  return (
    <mesh name="turret-lens-barrel" geometry={geometry} receiveShadow>
      <Surface kind="steel" color="#ffffff" vertexColors />
    </mesh>
  );
}

const FOOT = [
  [-0.11, -0.062],
  [0.11, -0.062],
  [0.15, -0.027],
  [0.11, 0.044],
  [-0.11, 0.044],
  [-0.15, -0.027],
] as [number, number][];

function segment(from: Point, to: Point): Joint {
  const pivot = new Vector3(...from);
  const direction = new Vector3(...to).sub(pivot);
  const length = direction.length();
  return {
    from: pivot,
    rotation: new Quaternion().setFromUnitVectors(UP, direction.normalize()),
    length,
  };
}

function legLayout(variant: TurretVariant) {
  const active = variant === 'active';
  const damaged = variant === 'damaged';
  const joint = active ? 1.12 : damaged ? 0.8 : 0.6;
  return [0, 1, 2].map((index) => {
    const side = index === 0 ? -1 : 1;
    const rear = index === 2;
    const hip: Point = rear ? [0, joint, -0.2] : [side * 0.32, joint, 0.015];
    const knee: Point = rear
      ? [0, active ? 0.61 : 0.35, -0.45]
      : [side * (active ? 0.59 : 0.58), active ? 0.68 : 0.31, damaged && side > 0 ? 0.12 : 0.22];
    const foot: Point = rear
      ? [0, 0.082, active ? -0.7 : -0.5]
      : [side * (active ? 0.76 : 0.68), 0.082, damaged && side > 0 ? 0.08 : active ? 0.41 : 0.31];
    return { thigh: segment(hip, knee), shin: segment(knee, foot), foot };
  });
}

function legParts(length: number, upper: boolean, damaged: boolean) {
  const d = upper ? 0.16 : damaged ? 0.095 : 0.123;
  const piece = beveledPlate(
    [
      [-d * 0.5, 0],
      [d * 0.48, 0],
      [d * 0.6, length * 0.28],
      [d * 0.31, length],
      [-d * 0.37, length],
      [-d * 0.49, length * 0.18],
    ],
    d,
    upper ? '#617368' : '#949b88',
    0.016,
  );
  return [
    piece,
    pivot(d * 0.64, d * 1.17, [0, 0.02, 0], '#324542', 8),
    ...(upper
      ? [block([0.04, length * 0.58, 0.034], [0, length * 0.46, d * 0.57], '#a8ab8f')]
      : []),
  ];
}

function ArticulatedLeg({
  thigh,
  shin,
  id,
  damaged,
}: {
  thigh: Joint;
  shin: Joint;
  id: string;
  damaged: boolean;
}) {
  const upper = useRobotGeometry(`turret-hip:${id}`, () =>
    supervisorBatch(legParts(thigh.length, true, false)),
  );
  const lower = useRobotGeometry(`turret-knee:${id}`, () =>
    supervisorBatch(legParts(shin.length, false, damaged)),
  );
  const shoe = useRobotGeometry('turret-foot', () =>
    supervisorBatch([beveledPlate(FOOT, 0.33, '#4d5e53', 0.018)]),
  );
  return (
    <group name={`turret-hip-${id}`} position={thigh.from} quaternion={thigh.rotation}>
      <mesh geometry={upper} receiveShadow>
        <Surface kind="steel" color="#ffffff" vertexColors />
      </mesh>
      <group
        name={`turret-knee-${id}`}
        position={[0, thigh.length, 0]}
        quaternion={thigh.rotation.clone().invert().multiply(shin.rotation)}
      >
        <mesh geometry={lower} receiveShadow>
          <Surface kind="steel" color="#ffffff" vertexColors />
        </mesh>
        <mesh
          geometry={shoe}
          name={`turret-foot-${id}`}
          position={[0, shin.length, 0]}
          quaternion={shin.rotation.clone().invert()}
          receiveShadow
        >
          <Surface kind="steel" color="#ffffff" vertexColors />
        </mesh>
      </group>
    </group>
  );
}

function DistantLegs({
  variant,
  legs,
}: {
  variant: TurretVariant;
  legs: ReturnType<typeof legLayout>;
}) {
  const geometry = useRobotGeometry(`turret-distant-legs:${variant}`, () =>
    supervisorBatch(
      legs.flatMap(({ thigh, shin, foot }) => [
        ...[thigh, shin].map(({ from, length, rotation }) => {
          const piece = block([0.105, length, 0.11], [0, length / 2, 0], '#596b62');
          piece.geometry.applyQuaternion(rotation).translate(from.x, from.y, from.z);
          return piece;
        }),
        block([0.23, 0.14, 0.28], foot, '#506357'),
      ]),
    ),
  );
  return (
    <mesh geometry={geometry}>
      <Surface kind="steel" color="#ffffff" vertexColors />
    </mesh>
  );
}

export function TurretLegs({ variant, detailed }: { variant: TurretVariant; detailed: boolean }) {
  const legs = useMemo(() => legLayout(variant), [variant]);
  if (!detailed) return <DistantLegs variant={variant} legs={legs} />;
  return legs.map(({ thigh, shin }, index) => (
    <ArticulatedLeg
      key={index}
      id={`${variant}-${index}`}
      thigh={thigh}
      shin={shin}
      damaged={variant === 'damaged' && index === 1}
    />
  ));
}
