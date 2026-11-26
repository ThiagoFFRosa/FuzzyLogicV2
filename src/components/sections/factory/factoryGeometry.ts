import { BoxGeometry } from 'three';

export class FactoryBoxes {
  private readonly geometries = new Map<string, BoxGeometry>();

  get(size: [number, number, number], concrete = false) {
    const key = `${concrete ? 'tiled' : 'unit'}:${size.join(',')}`;
    const existing = this.geometries.get(key);
    if (existing) return existing;
    const [width, height, depth] = size;
    const geometry = new BoxGeometry(width, height, depth);
    if (concrete) {
      const faceSizes = [
        [depth, height],
        [depth, height],
        [width, depth],
        [width, depth],
        [width, height],
        [width, height],
      ];
      const uv = geometry.attributes.uv;
      faceSizes.forEach(([horizontal, vertical], face) => {
        for (let corner = 0; corner < 4; corner++) {
          const index = face * 4 + corner;
          uv.setXY(index, uv.getX(index) ? horizontal / 4 : 0, uv.getY(index) ? vertical / 4 : 0);
        }
      });
    }
    this.geometries.set(key, geometry);
    return geometry;
  }

  dispose() {
    for (const geometry of this.geometries.values()) geometry.dispose();
    this.geometries.clear();
  }
}
