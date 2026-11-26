export const FLOOR_LEVEL = -1.25;

type Point = [number, number];

export interface FloorBreak {
  center: Point;
  size: Point;
  turn: number;
  depth: number;
  grass: number;
}

export const FLOOR_BREAKS: FloorBreak[] = [
  { center: [-13.2, 9.5], size: [1.48, 0.88], turn: 0.24, depth: 0.24, grass: 28 },
  { center: [-0.13, 4.58], size: [0.96, 0.51], turn: -0.26, depth: 0.17, grass: 15 },
  { center: [12.7, 6.9], size: [1.28, 0.68], turn: -0.58, depth: 0.22, grass: 24 },
  { center: [-24.1, 7.55], size: [1.46, 0.81], turn: 0.82, depth: 0.29, grass: 22 },
];

const PROFILE: Point[] = [
  [-1, -0.2],
  [-0.76, -0.62],
  [-0.34, -0.56],
  [-0.18, -1],
  [0.21, -0.79],
  [0.56, -0.85],
  [0.69, -0.38],
  [1, -0.31],
  [0.83, 0.1],
  [0.88, 0.39],
  [0.42, 0.62],
  [0.16, 0.5],
  [-0.22, 0.88],
  [-0.51, 0.53],
  [-0.9, 0.42],
];

export function brokenEdge(patch: FloorBreak): Point[] {
  const cos = Math.cos(patch.turn);
  const sin = Math.sin(patch.turn);
  return PROFILE.map(([x, z]) => {
    const localX = x * patch.size[0];
    const localZ = z * patch.size[1];
    return [
      patch.center[0] + cos * localX - sin * localZ,
      patch.center[1] + sin * localX + cos * localZ,
    ];
  });
}

export const SERVICE_BAY = {
  pallet: { x: -14.95, z: 6.25 },
  barrels: [
    { x: -17.65, z: 5.9, circuit: 0, radius: 0.45 },
    { x: -16.96, z: 6.46, circuit: 2, radius: 0.39 },
    { x: -15.85, z: 7.68, circuit: 1, radius: 0.43, tipped: true },
  ],
  scrap: { x: -11.25, z: 7.18 },
} as const;
