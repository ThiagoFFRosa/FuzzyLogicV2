import { useEffect, useMemo } from 'react';
import { Surface } from './FactoryMaterials';
import { curvedSkin } from './robotSkin';
import {
  beveledPlate,
  block,
  flange,
  hose,
  lathe,
  pivot,
  supervisorBatch,
} from './supervisorGeometry';

const PANELS = [
  [-0.86, 0.49, 0.53],
  [-0.74, 0.77, 0.8],
  [-0.53, 1.01, 1.07],
  [-0.27, 1.16, 1.21],
  [0.03, 1.23, 1.25],
  [0.29, 1.16, 1.17],
  [0.46, 1.01, 1.02],
  [0.52, 0.887, 0.9],
] as const;
const SEAMS = [-0.54, 0.94, 2.53, 4.17, Math.PI * 2 - 0.54];
const CERAMIC = ['#d2cbb0', '#b0baaa', '#c9c6b1', '#d7d3bd'];

export function SupervisorShell({ shadows }: { shadows: boolean }) {
  const { ceramic, chassis } = useMemo(() => {
    const ceramic = supervisorBatch([
      ...CERAMIC.map((color, i) => ({
        color,
        geometry: curvedSkin(PANELS, SEAMS[i] + 0.033, SEAMS[i + 1] - 0.033, 10, 0.079).rotateX(
          Math.PI / 2,
        ),
      })),
      ...[-1, 1].map((side) =>
        block([0.31, 0.31, 0.33], [side * 1.16, -0.13, -0.04], '#9fa497', side * 0.19),
      ),
      block([0.34, 0.17, 0.19], [0, -1.15, 0.34], '#c4c4af'),
    ]);
    const chassis = supervisorBatch([
      lathe(
        [
          [0, -0.94],
          [0.5, -0.94],
          [0.73, -0.71],
          [0.94, -0.5],
          [1.075, -0.23],
          [1.14, 0.02],
          [1.07, 0.26],
          [0.87, 0.38],
          [0.81, 0.42],
          [0.76, 0.33],
          [0.72, 0.18],
          [0, 0.18],
        ],
        '#293b3d',
      ),
      flange(0.88, 0.038, 0.465, '#647776'),
      flange(1.14, 0.025, 0.406, '#6a776f', 0.53, 0.33),
      flange(1.14, 0.025, 0.406, '#998962', 0.53, Math.PI - 0.86),
      flange(1.13, 0.029, 0.389, '#4f5e56', 0.59, 4.45),
      block([0.47, 0.31, 0.45], [0, 0.94, -0.38], '#6f7d74'),
      block([0.35, 0.11, 0.1], [0, -1.16, 0.418], '#283a39'),
      pivot(0.44, 0.15, [0, 0, -0.95], '#647263', 10),
      pivot(0.38, 0.046, [0, 0, -1.03], '#253a37', 10),
      ...Array.from({ length: 5 }, (_, index) =>
        block([0.54, 0.034, 0.059], [0, (index - 2) * 0.094, -1.069], '#899480'),
      ),
      ...[-1, 1].flatMap((side) => [
        rearSocket(side),
        hose(
          [
            [side * 0.21, 0.48, -1.04],
            [side * 0.34, 0.63, -0.98],
            [side * 0.34, 0.86, -0.71],
            [side * 0.24, 1.01, -0.43],
          ],
          0.028,
          '#a18c65',
        ),
        hose(
          [
            [side * 0.83, 0.66, 0.26],
            [side * 1.05, 0.81, 0.18],
            [side * 1.28, 0.74, 0.11],
            [side * 1.39, 0.52, 0.04],
            [side * 1.14, 0.31, -0.18],
          ],
          0.051,
          '#b9c0ab',
        ),
        pivot(0.091, 0.046, [side * 0.77, -0.73, 0.465], '#6f8178', 10),
        pivot(0.047, 0.039, [side * 0.77, -0.73, 0.492], '#3b4b46', 6),
      ]),
    ]);
    return { ceramic, chassis };
  }, []);
  useEffect(
    () => () => {
      ceramic.dispose();
      chassis.dispose();
    },
    [ceramic, chassis],
  );

  return (
    <>
      <mesh name="supervisor-shell" geometry={ceramic} castShadow={shadows} receiveShadow>
        <Surface kind="ceramic" color="#ffffff" vertexColors emissive="#879387" intensity={0.19} />
      </mesh>
      <mesh name="supervisor-service-chassis" geometry={chassis} receiveShadow>
        <Surface
          kind="wornPaint"
          color="#ffffff"
          vertexColors
          emissive="#5b716c"
          intensity={0.13}
        />
      </mesh>
    </>
  );
}

function rearSocket(side: number) {
  const socket = beveledPlate(
    [
      [-0.12, -0.14],
      [0.12, -0.14],
      [0.15, 0.11],
      [0, 0.18],
      [-0.15, 0.11],
    ],
    0.085,
    '#4d6158',
  );
  socket.geometry.translate(side * 0.22, 0.4, -0.964);
  return socket;
}
