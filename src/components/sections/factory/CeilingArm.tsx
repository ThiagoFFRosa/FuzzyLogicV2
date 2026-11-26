import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh } from 'three';
import { ARM, solveSupervisorElbow } from '../../../lib/supervisor';
import { Surface } from './FactoryMaterials';
import { beveledPlate, block, hose, lathe, pivot, supervisorBatch } from './supervisorGeometry';

const STEEL = '#778175';
const DARK = '#354743';
const JOINT = '#445b55';
const YOKE = '#938c71';

export interface SupervisorWrist {
  x: number;
  y: number;
}

function moveLink(link: Group, x: number, y: number, endX: number, endY: number) {
  link.position.set(x, y, 0);
  link.rotation.z = Math.atan2(x - endX, endY - y);
}

function linkGeometry(length: number, wide: number) {
  const cheeks = [-1, 1].map((side) => {
    const plate = beveledPlate(
      [
        [-0.105, 0.05],
        [0.079, 0.05],
        [0.13, length * 0.18],
        [0.073, length * 0.67],
        [0.095, length - 0.14],
        [0.037, length - 0.01],
        [-0.091, length - 0.04],
        [-0.066, length * 0.61],
        [-0.126, length * 0.21],
      ],
      0.43,
      side < 0 ? STEEL : JOINT,
    );
    plate.geometry.translate(side * wide * 0.52, 0, -0.045);
    return plate;
  });
  return supervisorBatch([
    ...cheeks,
    block([wide, length * 0.25, 0.17], [0, length * 0.5, -0.11], DARK, 0.23),
    pivot(wide * 0.62, 0.49, [0, 0.14, -0.039], DARK, 12),
    pivot(wide * 0.63, 0.46, [0, length - 0.12, -0.025], DARK, 12),
    pivot(wide * 0.39, 0.065, [0, 0.14, 0.229], YOKE, 10),
    pivot(wide * 0.37, 0.065, [0, length - 0.12, 0.229], STEEL, 10),
    hose(
      [
        [wide * 0.42, 0.12, -0.12],
        [wide * 0.66, 0.28, 0.19],
        [wide * 0.7, length * 0.48, 0.23],
        [wide * 0.68, length - 0.28, 0.17],
        [wide * 0.34, length - 0.08, -0.08],
      ],
      0.042,
      '#263735',
    ),
  ]);
}

function cylinderGeometry() {
  const barrel = lathe(
    [
      [0, 0.02],
      [0.125, 0.02],
      [0.135, 0.09],
      [0.105, 0.19],
      [0.114, 0.63],
      [0.144, 0.7],
      [0.137, 0.81],
      [0.055, 0.81],
    ],
    JOINT,
    12,
  );
  barrel.geometry.rotateX(-Math.PI / 2);
  return supervisorBatch([barrel, pivot(0.102, 0.31, [0, 0.041, 0.007], DARK, 10)]);
}

export function CeilingArm({
  pose,
  shadows,
  children,
}: {
  pose: RefObject<SupervisorWrist>;
  shadows: boolean;
  children: ReactNode;
}) {
  const upper = useRef<Group>(null);
  const lower = useRef<Group>(null);
  const elbow = useRef<Group>(null);
  const wrist = useRef<Group>(null);
  const piston = useRef<Group>(null);
  const rod = useRef<Mesh>(null);
  const { shoulderX, shoulderY, wristY } = ARM;
  const geometry = useMemo(
    () => ({
      rail: supervisorBatch([
        block([1.66, 0.35, 4.6], [shoulderX, 15.19, -0.2], '#4b5a55'),
        ...[-1, 1].flatMap((side) => [
          block([0.22, 0.32, 4.63], [shoulderX + side * 0.56, 14.87, -0.2], STEEL),
          block([0.12, 0.86, 1.05], [shoulderX + side * 0.57, 14.5, 0], DARK, side * -0.31),
          pivot(0.15, 0.082, [shoulderX + side * 0.54, 14.53, 0.559], YOKE, 8),
        ]),
        block([1.02, 0.55, 1.35], [shoulderX, 14.49, 0], JOINT),
        ...[-0.22, 0.22].map((offset) => {
          const clevis = beveledPlate(
            [
              [-0.28, -0.46],
              [0, -0.75],
              [0.28, -0.46],
              [0.31, 0.74],
              [0.38, 1.34],
              [-0.38, 1.34],
              [-0.31, 0.74],
            ],
            0.135,
            DARK,
          );
          clevis.geometry.translate(shoulderX, shoulderY + 0.43, offset);
          return clevis;
        }),
        pivot(0.39, 0.62, [shoulderX, shoulderY, 0], DARK),
        pivot(0.27, 0.075, [shoulderX, shoulderY, 0.344], STEEL),
        hose(
          [
            [shoulderX + 0.44, 14.63, -1.35],
            [shoulderX + 0.64, 14.63, -0.19],
            [shoulderX + 0.64, 13.5, 0.11],
            [shoulderX + 0.24, shoulderY, 0.15],
          ],
          0.054,
          '#283a35',
        ),
      ]),
      upper: linkGeometry(ARM.upper, 0.43),
      lower: linkGeometry(ARM.lower, 0.36),
      elbow: supervisorBatch([
        pivot(0.35, 0.61, [0, 0, 0], '#3b4c47'),
        pivot(0.31, 0.076, [0, 0, -0.335], STEEL, 12),
        pivot(0.26, 0.094, [0, 0, 0.334], STEEL),
        pivot(0.11, 0.064, [0, 0, 0.397], '#9b9a7d', 8),
        hose(
          [
            [-0.17, 0.21, 0.29],
            [-0.33, 0.11, 0.39],
            [-0.36, -0.12, 0.37],
            [-0.19, -0.27, 0.23],
          ],
          0.044,
          '#263332',
        ),
      ]),
      wrist: supervisorBatch([
        pivot(0.26, 0.58, [0, 0, 0], DARK),
        pivot(0.174, 0.11, [0, 0, 0.29], STEEL),
        ...[-1, 1].map((side) =>
          block([0.13, 0.52, 0.47], [side * 0.198, -0.26, -0.16], STEEL, side * 0.28),
        ),
        block([0.52, 0.19, 0.51], [0, -0.47, -0.2], JOINT),
      ]),
      cylinder: cylinderGeometry(),
    }),
    [shoulderX, shoulderY],
  );
  useEffect(() => () => Object.values(geometry).forEach((mesh) => mesh.dispose()), [geometry]);

  useFrame(() => {
    if (
      !upper.current ||
      !lower.current ||
      !elbow.current ||
      !wrist.current ||
      !piston.current ||
      !rod.current
    )
      return;
    const { x, y } = pose.current;
    const middle = solveSupervisorElbow(x, y);
    moveLink(upper.current, shoulderX, shoulderY, middle.x, middle.y);
    moveLink(lower.current, middle.x, middle.y, x, y);
    elbow.current.position.set(middle.x, middle.y, 0);
    wrist.current.position.set(x, y, 0);
    const startX = MathUtils.lerp(shoulderX, middle.x, 0.66) + 0.24;
    const startY = MathUtils.lerp(shoulderY, middle.y, 0.66);
    const endX = MathUtils.lerp(middle.x, x, 0.56) + 0.15;
    const endY = MathUtils.lerp(middle.y, y, 0.56);
    moveLink(piston.current, startX, startY, endX, endY);
    piston.current.position.z = 0.29;
    const extension = Math.max(0.001, Math.hypot(endX - startX, endY - startY) - 0.81);
    rod.current.position.y = 0.81 + extension / 2;
    rod.current.scale.y = extension;
  });

  return (
    <group name="supervisor-ceiling-arm">
      <mesh name="supervisor-ceiling-rail" geometry={geometry.rail} receiveShadow>
        <Surface
          kind="wornPaint"
          color="#ffffff"
          vertexColors
          emissive="#5f7168"
          intensity={0.14}
        />
      </mesh>
      <group ref={upper} name="supervisor-upper-link">
        <mesh geometry={geometry.upper} receiveShadow>
          <Surface
            kind="wornPaint"
            color="#ffffff"
            vertexColors
            emissive="#556961"
            intensity={0.13}
          />
        </mesh>
      </group>
      <group ref={lower} name="supervisor-lower-link">
        <mesh geometry={geometry.lower} castShadow={shadows} receiveShadow>
          <Surface
            kind="wornPaint"
            color="#ffffff"
            vertexColors
            emissive="#65786a"
            intensity={0.17}
          />
        </mesh>
      </group>
      <group ref={elbow} name="supervisor-elbow">
        <mesh geometry={geometry.elbow} receiveShadow>
          <Surface kind="steel" color="#ffffff" vertexColors />
        </mesh>
      </group>
      <group ref={piston} name="supervisor-piston">
        <mesh geometry={geometry.cylinder}>
          <Surface kind="steel" color="#ffffff" vertexColors />
        </mesh>
        <mesh ref={rod} name="supervisor-piston-rod">
          <cylinderGeometry args={[0.054, 0.054, 1, 10]} />
          <Surface kind="steel" color="#a5ab98" emissive="#626a5d" intensity={0.12} />
        </mesh>
      </group>
      <group ref={wrist} name="supervisor-wrist" position={[0, wristY, 0]}>
        <mesh geometry={geometry.wrist} receiveShadow>
          <Surface kind="steel" color="#ffffff" vertexColors />
        </mesh>
        {children}
      </group>
    </group>
  );
}
