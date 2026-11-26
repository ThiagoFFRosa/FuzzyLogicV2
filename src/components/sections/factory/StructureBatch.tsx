import { useCallback } from 'react';
import { Object3D } from 'three';
import type { InstancedMesh } from 'three';
import { Surface, useFactoryBox } from './FactoryMaterials';
import type { FactorySurface } from './FactoryMaterials';

type Vector = [number, number, number];
const NO_ROTATION: Vector = [0, 0, 0];

export function StructureBatch({
  positions,
  size,
  color,
  kind = 'paint',
  rotation = NO_ROTATION,
  casts = false,
}: {
  positions: readonly Vector[];
  size: Vector;
  color: string;
  kind?: FactorySurface;
  rotation?: Vector;
  casts?: boolean;
}) {
  const geometry = useFactoryBox(size, kind === 'concrete');
  const [x, y, z] = rotation;
  const setMatrices = useCallback(
    (mesh: InstancedMesh) => {
      const part = new Object3D();
      part.rotation.set(x, y, z);
      positions.forEach(([left, height, depth], index) => {
        part.position.set(left, height, depth);
        part.updateMatrix();
        mesh.setMatrixAt(index, part.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
    [positions, x, y, z],
  );

  return (
    <instancedMesh
      args={[geometry, undefined, positions.length]}
      receiveShadow
      castShadow={casts}
      matrixAutoUpdate={false}
      onUpdate={setMatrices}
    >
      <Surface kind={kind} color={color} />
    </instancedMesh>
  );
}
