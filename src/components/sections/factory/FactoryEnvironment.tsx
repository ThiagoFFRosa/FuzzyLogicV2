import { Fragment, memo, useEffect, useMemo } from 'react';
import { Color, DoubleSide, Object3D } from 'three';
import { wallTexture } from './sceneTextures';
import { Surface, useFactoryBox } from './FactoryMaterials';
import type { FactorySurface } from './FactoryMaterials';
import { FactoryFloor } from './FactoryFloor';
import { IndustrialWindows, WINDOW_CENTERS, WINDOW_WIDTH } from './IndustrialWindows';
import { MechanicalPlates } from './MechanicalParts';
import { StructureBatch } from './StructureBatch';
import type { FactoryQuality } from '../../../lib/factoryQuality';
type V3 = [number, number, number];
const REAR_WALL_SECTORS = [0, 4, 8].map((start) => {
  const bays = Array.from({ length: 4 }, (_, index) => start + index);
  return {
    columns: bays.map((index): V3 => [-30 + index * 5.4, 6.5, -7.55]),
    edges: bays.map((index): V3 => [-30 + index * 5.4, 1, -7.46]),
    lightPanels: bays
      .filter((index) => index % 3 === 0)
      .map((index): V3 => [-27.35 + index * 5.4, 2.55, -7.65]),
    darkPanels: bays
      .filter((index) => index % 3 !== 0)
      .map((index): V3 => [-27.35 + index * 5.4, 2.55, -7.65]),
    bars: bays
      .filter((index) => index % 2 === 0)
      .map((index): V3 => [-28 + index * 5.4, 2.2, -7.45]),
  };
});
export function Structure({
  position,
  size,
  color = '#303d40',
  rotation = [0, 0, 0],
  kind = 'paint',
  casts = false,
}: {
  position: V3;
  size: V3;
  color?: string;
  rotation?: V3;
  kind?: FactorySurface;
  casts?: boolean;
}) {
  const geometry = useFactoryBox(size, kind === 'concrete');
  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      receiveShadow
      castShadow={casts}
    >
      <Surface kind={kind} color={color} />
    </mesh>
  );
}
const PLANT_POSITIONS: { position: V3; scale: number }[] = [
  { position: [-12, -1.2, 4], scale: 0.9 },
  { position: [10, -1.2, 5], scale: 0.7 },
  { position: [-5, 4.2, -5], scale: 0.55 },
  { position: [14, 4.2, -6], scale: 0.8 },
];
const RAIL_POSTS = Array.from({ length: 24 }, (_, i) => ({
  at: [-28 + i * 2.4, 4.7, -4.65] as V3,
  size: [0.055, 1.1, 0.055] as V3,
  color: '#65716b',
}));

function Plants({ quality }: { quality: FactoryQuality }) {
  const branches = quality === 'low' ? 4 : 7;
  const transforms = useMemo(() => {
    const stem = new Object3D();
    const leaf = new Object3D();
    const branch = new Object3D();
    const root = new Object3D();
    stem.position.set(0, 0.65, 0);
    leaf.position.set(0.17, 0.95, 0);
    leaf.rotation.set(0.2, 0, -0.7);
    leaf.scale.set(0.19, 0.43, 0.04);
    branch.add(stem, leaf);
    root.add(branch);
    return PLANT_POSITIONS.flatMap(({ position, scale }) => {
      root.position.set(...position);
      root.scale.setScalar(scale);
      return Array.from({ length: branches }, (_, i) => {
        branch.rotation.set(0.2 * Math.sin(i), i * 2.4, 0.35 * Math.cos(i));
        root.updateMatrixWorld(true);
        return {
          stem: stem.matrixWorld.clone(),
          leaf: leaf.matrixWorld.clone(),
          tint: new Color(i % 2 ? '#657b4d' : '#3c6044'),
        };
      });
    });
  }, [branches]);
  return (
    <>
      <instancedMesh
        args={[undefined, undefined, transforms.length]}
        onUpdate={(mesh) => {
          transforms.forEach(({ stem }, index) => mesh.setMatrixAt(index, stem));
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <cylinderGeometry args={[0.018, 0.027, 1.3, 5]} />
        <meshStandardMaterial color="#3e5740" />
      </instancedMesh>
      <instancedMesh
        args={[undefined, undefined, transforms.length]}
        castShadow={quality === 'high'}
        onUpdate={(mesh) => {
          transforms.forEach(({ leaf, tint }, index) => {
            mesh.setMatrixAt(index, leaf);
            mesh.setColorAt(index, tint);
          });
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.computeBoundingSphere();
        }}
      >
        <sphereGeometry args={[1, 5, 3]} />
        <meshStandardMaterial side={DoubleSide} />
      </instancedMesh>
    </>
  );
}
const GROWTH: { position: V3; hanging?: boolean }[] = [
  { position: [-16.9, -1.2, -2.7] },
  { position: [-12, -1.2, 4] },
  { position: [10, -1.2, 5] },
  { position: [9.2, -1.18, -3.8] },
  { position: [-5.2, 4.2, -5.15], hanging: true },
  { position: [13.85, 4.2, -4.9], hanging: true },
];
function GroundGrowth({ quality }: { quality: FactoryQuality }) {
  const leavesPerPatch = quality === 'low' ? 8 : 15;
  return (
    <instancedMesh
      args={[undefined, undefined, GROWTH.length * leavesPerPatch]}
      castShadow={quality === 'high'}
      receiveShadow
      onUpdate={(mesh) => {
        const leaf = new Object3D();
        const tint = new Color();
        GROWTH.forEach(({ position: [x, y, z], hanging }, patch) => {
          for (let i = 0; i < leavesPerPatch; i++) {
            const phase = (i + patch * 3) * 2.4;
            const spread = i / leavesPerPatch;
            leaf.position.set(
              x + Math.cos(phase) * (hanging ? 0.32 : 0.75) * spread,
              y + (hanging ? -0.95 * spread : 0.035 + 0.04 * Math.sin(phase)),
              z + Math.sin(phase) * (hanging ? 0.06 : 0.3),
            );
            leaf.rotation.set(hanging ? phase : Math.PI / 2 + 0.34 * Math.sin(phase), 0, phase);
            leaf.scale.set(0.08 + (i % 3) * 0.033, 0.13 + (i % 4) * 0.04, 0.025);
            leaf.updateMatrix();
            const index = patch * leavesPerPatch + i;
            mesh.setMatrixAt(index, leaf.matrix);
            mesh.setColorAt(index, tint.set(i % 3 ? '#6d8055' : '#405941'));
          }
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }}
    >
      <sphereGeometry args={[1, 5, 3]} />
      <Surface kind="foliage" color="#e2efc1" />
    </instancedMesh>
  );
}
export const FactoryEnvironment = memo(function FactoryEnvironment({
  quality,
  compact,
}: {
  quality: FactoryQuality;
  compact: boolean;
}) {
  const economy = compact && quality === 'low';
  const sign = useMemo(wallTexture, []);
  useEffect(() => () => sign.dispose(), [sign]);
  return (
    <group>
      <hemisphereLight args={['#bbcfd3', '#4a4b42', 0.75]} />
      <directionalLight position={[-8, 12, -9]} color="#a7bfd1" intensity={0.22} />
      <FactoryFloor />
      {/* The visible set sits inside a closed hall, with room behind the dressed walls. */}
      <Structure position={[0, 4.25, -8]} size={[72, 10.5, 0.6]} color="#46514f" kind="concrete" />
      <Structure position={[0, 14.15, -8]} size={[72, 3.3, 0.6]} color="#394744" />
      {[-36, ...WINDOW_CENTERS.map((x) => x + WINDOW_WIDTH / 2)].map((left, index) => {
        const right = index < WINDOW_CENTERS.length ? WINDOW_CENTERS[index] - WINDOW_WIDTH / 2 : 36;
        return (
          <Structure
            key={left}
            position={[(left + right) / 2, 11, -8]}
            size={[right - left, 3, 0.6]}
            color="#43504d"
          />
        );
      })}
      <IndustrialWindows />
      <Structure position={[0, 7.1, 41]} size={[72, 16.7, 0.7]} color="#202d30" />
      <Structure position={[0, 15.6, 16.5]} size={[72, 0.5, 50]} color="#293639" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Structure position={[side * 35, 7.1, 16.5]} size={[0.6, 16.7, 50]} color="#2e3b3d" />
          <Structure position={[side * 34.55, 0, 16.5]} size={[0.35, 2.5, 50]} color="#243233" />
          {!economy &&
            [-4, 5, 14, 23, 32].map((z) => (
              <Structure
                key={z}
                position={[side * 34.45, 7.1, z]}
                size={[0.65, 16.7, 0.55]}
                color="#394644"
              />
            ))}
          <Structure
            position={[side * 28.2, 7.1, -7.25]}
            size={[0.58, 16.7, 0.95]}
            color="#394644"
            casts
          />
        </group>
      ))}
      {REAR_WALL_SECTORS.map(({ columns, edges, lightPanels, darkPanels, bars }) => (
        <Fragment key={columns[0][0]}>
          <StructureBatch positions={columns} size={[0.18, 15, 0.22]} color="#293739" />
          <StructureBatch positions={edges} size={[5.2, 0.08, 0.1]} color="#56615c" />
          <StructureBatch positions={lightPanels} size={[5.18, 2.8, 0.13]} color="#4b5650" />
          <StructureBatch positions={darkPanels} size={[5.18, 2.8, 0.13]} color="#3d4947" />
          <StructureBatch positions={bars} size={[0.12, 2.8, 0.05]} color="#4d5851" />
        </Fragment>
      ))}
      <mesh position={[-5, 6.3, -7.62]}>
        <planeGeometry args={[13, 6.5]} />
        <meshBasicMaterial map={sign} transparent opacity={0.46} depthWrite={false} />
      </mesh>
      {[
        [-17, 0, -3],
        [-4, 0, -4],
        [9, 0, -4],
        [21, 0, -2],
      ].map(([x, , z], i) => (
        <group key={i}>
          <Structure
            position={[x, 6, z]}
            size={[0.42, 15, 0.5]}
            color="#344043"
            kind="wornPaint"
            casts
          />
          <Structure
            position={[x + 2.5, 7.5, z]}
            size={[0.15, 7, 0.15]}
            rotation={[0, 0, -0.7]}
            color="#5f5b4a"
          />
          <Structure
            position={[x - 2.5, 7.5, z]}
            size={[0.15, 7, 0.15]}
            rotation={[0, 0, 0.7]}
            color="#4a504a"
          />
        </group>
      ))}
      <Structure position={[0, 12, -3.5]} size={[56, 0.45, 0.5]} color="#46504a" />
      <Structure position={[0, 4.1, -5.7]} size={[55, 0.25, 2.4]} color="#333e3c" casts />
      <Structure position={[0, 5.25, -4.65]} size={[55, 0.07, 0.07]} color="#66726b" />
      <MechanicalPlates plates={RAIL_POSTS} kind="paint" />
      <mesh position={[-15, 8, -6]} rotation={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.6, 0.6, 20, 12]} />
        <meshStandardMaterial color="#7b8270" roughness={0.85} />
      </mesh>
      {!economy &&
        [2.5, 4, 5.5, 7, 8.5, 10, 11.5].map((y) => (
          <mesh key={y} position={[-15, y, -6]} rotation={[Math.PI / 2, 0, -0.15]}>
            <torusGeometry args={[0.64, 0.07, 6, 16]} />
            <meshStandardMaterial color="#404d46" />
          </mesh>
        ))}
      {[-3, 5, 13].map((x) => (
        <group key={x}>
          <Structure position={[x, 11, -7.4]} size={[0.12, 3.2, 0.2]} />
          <Structure position={[x, 11, -7.35]} size={[6, 0.12, 0.2]} />
          <Structure position={[x, 11, -7.3]} size={[0.12, 7, 0.12]} rotation={[0, 0, -1]} />
        </group>
      ))}
      <Plants quality={quality} />
      <GroundGrowth quality={quality} />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          position={[(i < 4 ? -13 : 10) + (i % 4) * 0.57, -1.23, 4 + (i % 3) * 0.37]}
          rotation={[-Math.PI / 2, 0, i * 0.5]}
        >
          <circleGeometry args={[0.21 + (i % 3) * 0.09, 7]} />
          <meshStandardMaterial color="#405941" roughness={1} />
        </mesh>
      ))}
      <Structure position={[5, 5.5, -6.6]} size={[3, 0.2, 2]} color="#566058" />
      {[-8, 14].map((x) => (
        <Structure
          key={x}
          position={[x, -0.7, 4]}
          size={[2, 0.8, 1.4]}
          rotation={[0, 0.3, 0.1]}
          color="#424e49"
        />
      ))}
    </group>
  );
});
