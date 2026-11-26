import { Fragment, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, Object3D } from 'three';
import { BELT_SURFACE, ROLLER_RADIUS, beltPosition, rollerAngle } from '../../../lib/conveyor';
import { Structure } from './FactoryEnvironment';
import { Surface } from './FactoryMaterials';
import { StructureBatch } from './StructureBatch';
const ROLLER_COUNT = 31;
const SHAFT_Y = BELT_SURFACE - ROLLER_RADIUS;
const ROLLER_POSITIONS = Array.from({ length: ROLLER_COUNT }, (_, index) => -21 + index * 1.4);
const GUIDE_RIVETS = [-2.17, 2.17].flatMap((z) =>
  Array.from({ length: ROLLER_COUNT }, (_, index) => ({ x: -21 + index * 1.4, z })),
);
const SUPPORT_SECTORS = [
  [-18, -11],
  [-4, 3],
  [10, 17],
].map((positions) => ({
  joins: positions.map((x): [number, number, number] => [x, 0.09, 0]),
  legs: positions.flatMap((x) => [-1.62, 1.62].map((z): [number, number, number] => [x, -0.52, z])),
  feet: positions.flatMap((x) => [-1.62, 1.62].map((z): [number, number, number] => [x, -1.14, z])),
  braces: positions.map((x): [number, number, number] => [x, -0.52, 0]),
}));
const STRIPE_SECTORS = [0, 7, 14].map((start) => {
  const indexes = Array.from({ length: 7 }, (_, index) => start + index);
  return [0, 1].map((parity) =>
    indexes
      .filter((index) => index % 2 === parity)
      .map((index): [number, number, number] => [-20 + index * 2, 0.78, 2.15]),
  );
});
export function Conveyor({ travel }: { travel: MutableRefObject<number> }) {
  const slats = useRef<InstancedMesh>(null);
  const marks = useRef<InstancedMesh>(null);
  const rollers = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const translation = useMemo(() => new Matrix4(), []);
  const previousTravel = useRef<number | undefined>(undefined);
  useFrame(() => {
    if (
      !slats.current ||
      !marks.current ||
      !rollers.current ||
      previousTravel.current === travel.current
    )
      return;
    previousTravel.current = travel.current;
    for (let i = 0; i < 80; i++) {
      translation.makeTranslation(beltPosition(-20 + i * 0.5, travel.current), 0.88, 0);
      slats.current.setMatrixAt(i, translation);
    }
    slats.current.instanceMatrix.needsUpdate = true;
    const angle = rollerAngle(travel.current);
    ROLLER_POSITIONS.forEach((x, index) => {
      const phase = angle + index * 0.45;
      dummy.position.set(x, SHAFT_Y, 0);
      dummy.rotation.set(Math.PI / 2, 0, phase, 'ZYX');
      dummy.updateMatrix();
      rollers.current!.setMatrixAt(index, dummy.matrix);
      dummy.position.set(
        x - Math.sin(phase) * ROLLER_RADIUS,
        SHAFT_Y + Math.cos(phase) * ROLLER_RADIUS,
        0,
      );
      dummy.rotation.set(0, 0, phase);
      dummy.updateMatrix();
      marks.current!.setMatrixAt(index, dummy.matrix);
    });
    marks.current.instanceMatrix.needsUpdate = true;
    rollers.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <Structure
        position={[0, 0.51, 0]}
        size={[43, 0.62, 4.1]}
        color="#3e4b4a"
        kind="steel"
        casts
      />
      <Structure position={[0, 0.795, 0]} size={[42, 0.12, 3.7]} color="#253332" kind="rubber" />
      <instancedMesh
        ref={rollers}
        name="conveyor-rollers"
        args={[undefined, undefined, ROLLER_COUNT]}
        receiveShadow
        onUpdate={(mesh) => {
          previousTravel.current = undefined;
          const roller = new Object3D();
          const tint = new Color();
          roller.rotation.x = Math.PI / 2;
          ROLLER_POSITIONS.forEach((x, index) => {
            roller.position.set(x, SHAFT_Y, 0);
            roller.updateMatrix();
            mesh.setMatrixAt(index, roller.matrix);
            mesh.setColorAt(index, tint.set(index % 3 ? '#798b86' : '#566d69'));
          });
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <cylinderGeometry args={[ROLLER_RADIUS, ROLLER_RADIUS, 4.05, 12]} />
        <Surface kind="steel" color="#ffffff" />
      </instancedMesh>
      <instancedMesh ref={marks} args={[undefined, undefined, ROLLER_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.065, 0.016, 3.72]} />
        <Surface kind="steel" color="#b4b8a2" />
      </instancedMesh>
      <instancedMesh ref={slats} args={[undefined, undefined, 80]} receiveShadow>
        <boxGeometry args={[0.12, 0.05, 3.65]} />
        <Surface kind="steel" color="#65726e" />
      </instancedMesh>
      <instancedMesh
        args={[undefined, undefined, GUIDE_RIVETS.length]}
        onUpdate={(mesh) => {
          const rivet = new Object3D();
          rivet.rotation.x = Math.PI / 2;
          GUIDE_RIVETS.forEach(({ x, z }, index) => {
            rivet.position.set(x, 0.55, z);
            rivet.updateMatrix();
            mesh.setMatrixAt(index, rivet.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <cylinderGeometry args={[0.13, 0.13, 0.1, 8]} />
        <Surface kind="steel" color="#131f22" />
      </instancedMesh>
      {[-2.04, 2.04].map((z) => (
        <group key={z}>
          <Structure
            position={[0, 0.96, z]}
            size={[43, 0.25, 0.14]}
            color="#929783"
            kind="wornPaint"
            casts
          />
          <Structure position={[0, 0.4, z]} size={[43, 0.3, 0.2]} color="#535c55" />
        </group>
      ))}
      {SUPPORT_SECTORS.map(({ joins, legs, feet, braces }) => (
        <Fragment key={joins[0][0]}>
          <StructureBatch positions={joins} size={[0.36, 0.3, 4.25]} color="#3b4c48" />
          <StructureBatch
            positions={legs}
            size={[0.28, 1.22, 0.38]}
            color="#596b64"
            kind="wornPaint"
            casts
          />
          <StructureBatch positions={feet} size={[1, 0.22, 0.85]} color="#69766b" />
          <StructureBatch
            positions={braces}
            size={[0.13, 3.45, 0.16]}
            rotation={[1.23, 0, 0]}
            color="#5c6c62"
          />
        </Fragment>
      ))}
      {[-20.5, 20.5].map((x) => (
        <mesh key={x} position={[x, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 3.65, 16]} />
          <meshStandardMaterial color="#68716a" roughness={0.72} metalness={0.5} />
        </mesh>
      ))}
      {STRIPE_SECTORS.flatMap((sector) =>
        sector.map((positions, parity) => (
          <StructureBatch
            key={positions[0][0]}
            positions={positions}
            size={[0.85, 0.11, 0.04]}
            color={parity ? '#9b8b52' : '#243337'}
            rotation={[0, 0, -0.16]}
          />
        )),
      )}
    </group>
  );
}
