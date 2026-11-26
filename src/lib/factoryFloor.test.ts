import { expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { floorSurface } from '../components/sections/factory/FloorBreaks';
import { FLOOR_BREAKS, FLOOR_LEVEL } from '../components/sections/factory/groundLayout';

it('leaves open concrete breaks while keeping the service aisle solid', () => {
  const geometry = floorSurface(-55, -38, 110, 100, 4);
  const ground = new Mesh(geometry, new MeshBasicMaterial());
  ground.position.y = FLOOR_LEVEL;
  ground.rotation.x = -Math.PI / 2;
  ground.updateMatrixWorld();
  const ray = new Raycaster();
  const down = new Vector3(0, -1, 0);
  const hits = (x: number, z: number) => {
    ray.set(new Vector3(x, FLOOR_LEVEL + 1, z), down);
    return ray.intersectObject(ground);
  };
  try {
    for (const {
      center: [x, z],
    } of FLOOR_BREAKS)
      expect(hits(x, z)).toHaveLength(0);
    expect(hits(0, 3).length).toBeGreaterThan(0);
  } finally {
    geometry.dispose();
    ground.material.dispose();
  }
});
