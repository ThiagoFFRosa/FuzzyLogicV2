import { BufferGeometry, Float32BufferAttribute } from 'three';

type Section = readonly [height: number, width: number, depth: number, offset?: number];

// Two skins and four closed edges. The section axes are X and Z; the loft follows Y.
export function curvedSkin(
  sections: readonly Section[],
  start: number,
  end: number,
  segments: number,
  thickness: number,
) {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const stride = segments + 1;
  const layerSize = sections.length * stride;
  for (const inset of [0, thickness]) {
    sections.forEach(([height, width, depth, offset = 0], row) => {
      for (let column = 0; column <= segments; column++) {
        const u = column / segments;
        const theta = start + (end - start) * u;
        positions.push(
          (width - inset) * Math.cos(theta),
          height,
          offset + (depth - inset) * Math.sin(theta),
        );
        uv.push(u, row / (sections.length - 1));
      }
    });
  }
  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d);
  };
  for (let row = 0; row < sections.length - 1; row++) {
    for (let column = 0; column < segments; column++) {
      const a = row * stride + column;
      quad(a, a + stride, a + stride + 1, a + 1);
      const inner = a + layerSize;
      quad(inner, inner + 1, inner + stride + 1, inner + stride);
    }
    const first = row * stride;
    const last = first + segments;
    quad(first, first + layerSize, first + stride + layerSize, first + stride);
    quad(last, last + stride, last + stride + layerSize, last + layerSize);
  }
  const top = (sections.length - 1) * stride;
  for (let column = 0; column < segments; column++) {
    quad(column, column + 1, column + 1 + layerSize, column + layerSize);
    const a = top + column;
    quad(a, a + layerSize, a + layerSize + 1, a + 1);
  }
  const mesh = new BufferGeometry();
  mesh.setIndex(indices);
  mesh.setAttribute('position', new Float32BufferAttribute(positions, 3));
  mesh.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  mesh.computeVertexNormals();
  return mesh;
}

export function raisedLens(radius: number, depth: number, segments: number) {
  const positions = [0, 0, depth];
  const uv = [0.5, 0.5];
  const indices: number[] = [];
  for (const ring of [0.48, 0.79, 1]) {
    for (let slice = 0; slice < segments; slice++) {
      const theta = (slice * Math.PI * 2) / segments;
      const x = ring * Math.cos(theta);
      const y = ring * Math.sin(theta);
      positions.push(radius * x, radius * y, depth * (1 - ring * ring));
      uv.push(0.5 + 0.5 * x, 0.5 + 0.5 * y);
    }
  }
  for (let slice = 0; slice < segments; slice++) {
    const a = slice + 1;
    const b = ((slice + 1) % segments) + 1;
    indices.push(0, a, b);
    for (const row of [0, segments]) {
      indices.push(
        a + row,
        a + row + segments,
        b + row + segments,
        a + row,
        b + row + segments,
        b + row,
      );
    }
  }
  const mesh = new BufferGeometry();
  mesh.setIndex(indices);
  mesh.setAttribute('position', new Float32BufferAttribute(positions, 3));
  mesh.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  mesh.computeVertexNormals();
  return mesh;
}
