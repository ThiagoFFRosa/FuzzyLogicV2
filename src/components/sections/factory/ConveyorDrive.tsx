import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import type { Group } from 'three';
import { BELT_SURFACE, rollerAngle, ROLLER_RADIUS } from '../../../lib/conveyor';
import { IndustrialCable, MechanicalPlates } from './MechanicalParts';
import type { Plate } from './MechanicalParts';
import { Structure } from './FactoryEnvironment';
import { Surface } from './FactoryMaterials';

const DRIVE_X = 7;
const SHAFT_Y = BELT_SURFACE - ROLLER_RADIUS;
const MOTOR_Y = -0.48;
const PULLEY_RADIUS = 0.27;
const STRAIGHT = SHAFT_Y - MOTOR_Y;
const HALF_TURN = Math.PI * PULLEY_RADIUS;
const CHAIN_LENGTH = 2 * (STRAIGHT + HALF_TURN);
const LINKS = 32;
const MOUNT: Plate[] = [
  { at: [0, -0.96, 2.05], size: [1.55, 0.19, 1.15], color: '#55645b' },
  { at: [-0.42, -0.73, 2.05], size: [0.22, 0.3, 0.9], color: '#4a5350' },
  { at: [0.42, -0.73, 2.05], size: [0.22, 0.3, 0.9], color: '#4a5350' },
  { at: [0, 0.2, 2.42], size: [0.82, 1.62, 0.17], color: '#4a5550' },
  { at: [0.46, 0.06, 2.46], size: [0.19, 1.2, 0.22], color: '#5e6a5e' },
  ...Array.from({ length: 5 }, (_, index): Plate => ({
    at: [0, -0.34, 1.74 + index * 0.15],
    size: [1.12, 0.23, 0.076],
    color: '#758378',
  })),
];
const POWER_RUN: [number, number, number][] = [
  [-0.46, -0.3, 2.22],
  [-0.8, -0.24, 2.18],
  [-1.02, -0.52, 1.82],
  [-1.45, -0.74, 1.7],
  [-2.5, -0.74, 1.7],
];

export function ConveyorDrive({ travel }: { travel: RefObject<number> }) {
  const drive = useRef<Group>(null);
  const motor = useRef<Group>(null);
  const chain = useRef<InstancedMesh>(null);
  const link = useRef(new Object3D());
  const previous = useRef<number | undefined>(undefined);
  useFrame(() => {
    if (previous.current === travel.current) return;
    previous.current = travel.current;
    const angle = rollerAngle(travel.current);
    if (drive.current) drive.current.rotation.z = angle;
    if (motor.current) motor.current.rotation.z = angle;
    if (!chain.current) return;
    const part = link.current;
    const offset = ((travel.current * PULLEY_RADIUS) / ROLLER_RADIUS) % CHAIN_LENGTH;
    for (let index = 0; index < LINKS; index++) {
      const distance = (offset + (index * CHAIN_LENGTH) / LINKS) % CHAIN_LENGTH;
      if (distance < STRAIGHT) {
        part.position.set(-PULLEY_RADIUS, MOTOR_Y + distance, 2.75);
        part.rotation.z = 0;
      } else if (distance < STRAIGHT + HALF_TURN) {
        const turn = (distance - STRAIGHT) / PULLEY_RADIUS;
        part.position.set(
          -Math.cos(turn) * PULLEY_RADIUS,
          SHAFT_Y + Math.sin(turn) * PULLEY_RADIUS,
          2.75,
        );
        part.rotation.z = -turn;
      } else if (distance < 2 * STRAIGHT + HALF_TURN) {
        part.position.set(PULLEY_RADIUS, SHAFT_Y - (distance - STRAIGHT - HALF_TURN), 2.75);
        part.rotation.z = 0;
      } else {
        const turn = (distance - 2 * STRAIGHT - HALF_TURN) / PULLEY_RADIUS;
        part.position.set(
          Math.cos(turn) * PULLEY_RADIUS,
          MOTOR_Y - Math.sin(turn) * PULLEY_RADIUS,
          2.75,
        );
        part.rotation.z = -turn;
      }
      part.updateMatrix();
      chain.current.setMatrixAt(index, part.matrix);
    }
    chain.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[DRIVE_X, 0, 0]} name="conveyor-drive">
      <MechanicalPlates plates={MOUNT} kind="wornPaint" />
      <IndustrialCable points={POWER_RUN} />
      <instancedMesh ref={chain} args={[undefined, undefined, LINKS]} frustumCulled={false}>
        <boxGeometry args={[0.066, 0.063, 0.055]} />
        <Surface kind="steel" color="#94a293" />
      </instancedMesh>
      <mesh position={[0, MOTOR_Y, 2.05]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.44, 0.9, 12]} />
        <Surface kind="wornPaint" color="#638479" />
      </mesh>
      <Structure position={[-0.45, -0.26, 2.15]} size={[0.4, 0.35, 0.43]} color="#526d61" />
      <Structure position={[0, SHAFT_Y, 2.28]} size={[0.68, 0.54, 0.32]} color="#66736b" />
      {[-1, 1].map((side) => (
        <Structure
          key={side}
          position={[side * PULLEY_RADIUS, (MOTOR_Y + SHAFT_Y) / 2, 2.63]}
          size={[0.043, SHAFT_Y - MOTOR_Y, 0.1]}
          kind="rubber"
          color="#283432"
        />
      ))}
      {[SHAFT_Y, MOTOR_Y].map((y, index) => (
        <group
          key={y}
          ref={index ? motor : drive}
          position={[0, y, 2.64]}
          name={index ? 'drive-motor-shaft' : 'drive-output-shaft'}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <cylinderGeometry args={[PULLEY_RADIUS, PULLEY_RADIUS, 0.19, 16]} />
            <Surface kind="steel" color="#687b74" />
          </mesh>
          <MechanicalPlates
            plates={[
              { at: [0, 0, 0.13], size: [0.19, 0.17, 0.06], color: '#8c9c91' },
              { at: [0, 0.16, 0.11], size: [0.075, 0.13, 0.04], color: '#b69c63', angle: 0.16 },
            ]}
          />
        </group>
      ))}
    </group>
  );
}
