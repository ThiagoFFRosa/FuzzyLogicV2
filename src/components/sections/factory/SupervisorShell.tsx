import { useEffect, useMemo } from 'react';
import { Surface } from './FactoryMaterials';
import { block, flange, hose, lathe, pivot, supervisorBatch } from './supervisorGeometry';

export function SupervisorShell({ shadows }: { shadows: boolean }) {
  const { ceramic, chassis } = useMemo(() => {
    const ceramic = supervisorBatch([
      lathe(
        [
          [0.55, -0.59],
          [0.76, -0.53],
          [0.96, -0.4],
          [1.12, -0.23],
          [1.23, -0.01],
          [1.26, 0.2],
          [1.21, 0.36],
          [1.08, 0.49],
          [0.9, 0.51],
          [0.86, 0.45],
          [0.87, 0.35],
          [1.03, 0.27],
          [1.07, 0.13],
          [0.84, -0.39],
          [0.55, -0.59],
        ],
        '#d6d1b7',
      ),
      ...[-1, 1].map((side) =>
        block([0.31, 0.31, 0.33], [side * 1.16, -0.13, -0.04], '#9fa497', side * 0.19),
      ),
      block([0.34, 0.17, 0.19], [0, -1.15, 0.34], '#c4c4af'),
    ]);
    const chassis = supervisorBatch([
      lathe(
        [
          [0, -0.63],
          [0.5, -0.63],
          [0.86, -0.45],
          [1.08, -0.17],
          [1.17, 0.1],
          [1.12, 0.25],
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
      ...[-1, 1].flatMap((side) => [
        hose(
          [
            [side * 0.83, 0.66, 0.26],
            [side * 1.05, 0.81, 0.18],
            [side * 1.28, 0.74, 0.11],
            [side * 1.39, 0.52, 0.04],
            [side * 1.35, 0.31, -0.1],
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
      <mesh geometry={chassis} receiveShadow>
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
