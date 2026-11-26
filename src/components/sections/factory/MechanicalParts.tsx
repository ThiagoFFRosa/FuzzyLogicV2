import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, Color, Object3D, TubeGeometry, Vector3 } from 'three';
import { Surface } from './FactoryMaterials';
import type { FactorySurface } from './FactoryMaterials';

type Coordinates = [number, number, number];
export interface Plate {
  at: Coordinates;
  size: Coordinates;
  color: string;
  angle?: number;
}

export function MechanicalPlates({
  plates,
  kind = 'steel',
  receiveShadow = true,
  castShadow = false,
}: {
  plates: Plate[];
  kind?: FactorySurface;
  receiveShadow?: boolean;
  castShadow?: boolean;
}) {
  return (
    <instancedMesh
      args={[undefined, undefined, plates.length]}
      receiveShadow={receiveShadow}
      castShadow={castShadow}
      onUpdate={(mesh) => {
        const part = new Object3D();
        const tint = new Color();
        plates.forEach(({ at, size, color, angle }, index) => {
          part.position.set(...at);
          part.scale.set(...size);
          part.rotation.z = angle ?? 0;
          part.updateMatrix();
          mesh.setMatrixAt(index, part.matrix);
          mesh.setColorAt(index, tint.set(color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <Surface kind={kind} color="#ffffff" />
    </instancedMesh>
  );
}

export function IndustrialCable({
  points,
  radius = 0.06,
  color = '#252e31',
}: {
  points: Coordinates[];
  radius?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const path = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
    return new TubeGeometry(path, 20, radius, 6, false);
  }, [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <Surface kind="rubber" color={color} />
    </mesh>
  );
}
