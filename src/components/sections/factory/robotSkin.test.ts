import { expect, it } from 'vitest';
import { curvedSkin } from './robotSkin';

it('closes the edges of a segmented shell with real thickness', () => {
  const skin = curvedSkin(
    [
      [-1, 0.4, 0.32],
      [0, 0.68, 0.5],
      [1, 0.43, 0.34],
    ],
    -0.8,
    1.1,
    7,
    0.06,
  );
  const edgeUses = new Map<string, number>();
  const triangles = skin.index!.array;
  for (let face = 0; face < triangles.length; face += 3) {
    for (let edge = 0; edge < 3; edge++) {
      const a = triangles[face + edge];
      const b = triangles[face + ((edge + 1) % 3)];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1);
    }
  }
  expect(new Set(edgeUses.values())).toEqual(new Set([2]));
  expect(skin.attributes.normal.count).toBe(skin.attributes.position.count);
  skin.dispose();
});
