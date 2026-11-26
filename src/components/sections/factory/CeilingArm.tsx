import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh } from 'three';
import { ARM, solveSupervisorElbow } from '../../../lib/supervisor';
import { Surface } from './FactoryMaterials';
import { block, hose, pivot, supervisorBatch } from './supervisorGeometry';

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
  return supervisorBatch([
    block([wide, length - 0.24, 0.48], [0, length / 2, -0.05], DARK),
    block([wide * 0.76, length - 0.43, 0.08], [0, length / 2, 0.24], STEEL),
    block([wide + 0.12, 0.24, 0.59], [0, 0.27, 0], JOINT),
    block([wide + 0.1, 0.24, 0.59], [0, length - 0.27, 0], JOINT),
    block([0.077, length * 0.62, 0.09], [-wide * 0.5, length * 0.54, 0.27], '#8c9986'),
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
        ...[-1, 1].map((side) =>
          block([0.22, 0.32, 4.63], [shoulderX + side * 0.56, 14.87, -0.2], STEEL),
        ),
        block([1.02, 0.55, 1.35], [shoulderX, 14.49, 0], JOINT),
        block([0.55, 1.56, 0.59], [shoulderX, 13.54, 0], DARK),
        block([0.22, 1.29, 0.07], [shoulderX, 13.59, 0.32], YOKE),
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
        block([0.38, 0.47, 0.32], [0, -0.28, -0.24], STEEL),
        block([0.55, 0.21, 0.43], [0, -0.47, -0.2], JOINT),
      ]),
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
    const extension = Math.hypot(endX - startX, endY - startY) - 0.81;
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
      <group ref={elbow}>
        <mesh geometry={geometry.elbow} receiveShadow>
          <Surface kind="steel" color="#ffffff" vertexColors />
        </mesh>
      </group>
      <group ref={piston}>
        <mesh position={[0, 0.425, 0]}>
          <cylinderGeometry args={[0.108, 0.117, 0.85, 10]} />
          <Surface kind="steel" color="#485d55" />
        </mesh>
        <mesh ref={rod}>
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
