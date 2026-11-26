import type { FactorySurface } from './FactoryMaterials';
import type { Plate } from './MechanicalParts';

interface CrateDesign {
  dimensions: readonly [number, number, number];
  shell: string;
  frame: string;
  accent: string;
  paper: string;
  surface: FactorySurface;
  form: 'file' | 'dispatch' | 'instrument' | 'freight' | 'sample';
}

export const crateDesigns = [
  {
    form: 'file',
    surface: 'wornPaint',
    shell: '#76928a',
    frame: '#405b55',
    accent: '#315b5e',
    paper: '#c4cfc1',
    dimensions: [3.2, 2.4, 2.3],
  },
  {
    form: 'dispatch',
    surface: 'wornPaint',
    shell: '#afaa8d',
    frame: '#69694c',
    accent: '#6c5134',
    paper: '#e0cfac',
    dimensions: [2.9, 2.25, 2.15],
  },
  {
    form: 'instrument',
    surface: 'steel',
    shell: '#545a5d',
    frame: '#84867a',
    accent: '#aa5c2c',
    paper: '#d5c8aa',
    dimensions: [3, 2.15, 2.2],
  },
  {
    form: 'freight',
    surface: 'wood',
    shell: '#a9977c',
    frame: '#4f604b',
    accent: '#465a3c',
    paper: '#d4ceb1',
    dimensions: [2.65, 2.65, 2.4],
  },
  {
    form: 'sample',
    surface: 'wornPaint',
    shell: '#a6b7ae',
    frame: '#546760',
    accent: '#4c6767',
    paper: '#cdd9cc',
    dimensions: [3.05, 2.3, 2.1],
  },
] as const satisfies readonly CrateDesign[];

export function crateHardware(look: CrateDesign) {
  const [width, height, depth] = look.dimensions;
  const drawer = look.form === 'file' || look.form === 'dispatch';
  const freight = look.form === 'freight';
  const instrument = look.form === 'instrument';
  const z = depth / 2;
  const rim = height / 2 - 0.14;
  const edge = width / 2 - 0.12;
  const faceHeight = height * (drawer ? 0.72 : 0.79);
  const faceWidth = width * (drawer ? 0.91 : 0.88);
  const labelWidth = width * 0.78;
  const labelHeight = labelWidth * (192 / 512);
  const labelY = drawer ? -0.23 : 0.01;
  const handleY = labelY + labelHeight / 2 + 0.23;
  const handleWidth = width * (look.form === 'file' ? 0.31 : 0.44);
  const shell: Plate[] = [-1, 1].flatMap((side) => [
    { at: [side * (width / 2 - 0.086), rim, 0], size: [0.17, 0.16, depth], color: look.frame },
    { at: [0, rim, side * (z - 0.07)], size: [width - 0.17, 0.16, 0.15], color: look.frame },
    {
      at: [side * edge, -0.04, z + 0.015],
      size: [freight ? 0.2 : 0.13, height * 0.83, 0.09],
      color: look.frame,
    },
    {
      at: [side * (width / 2 - 0.14), -height / 2 + 0.125, 0],
      size: [instrument ? 0.38 : 0.27, 0.13, depth * 0.93],
      color: '#343832',
    },
    {
      at: [side * (width / 2 + 0.015), -height * 0.16, 0],
      size: [0.06, 0.12, depth * 0.78],
      color: look.frame,
    },
  ]);
  if (freight) {
    for (const line of [-0.29, 0.26]) {
      shell.push(
        { at: [0, height * line, z + 0.016], size: [width * 0.91, 0.047, 0.027], color: '#62533f' },
        ...[-1, 1].map((side): Plate => ({
          at: [side * (width / 2 + 0.012), height * line, 0],
          size: [0.026, 0.047, depth * 0.98],
          color: '#62533f',
        })),
      );
    }
  }
  const face: Plate[] = [
    ...(freight
      ? []
      : [
          {
            at: [0, -0.012, z + 0.014],
            size: [faceWidth, faceHeight, 0.075],
            color: drawer ? look.shell : look.frame,
          } satisfies Plate,
        ]),
    {
      at: [0, labelY, z + 0.057],
      size: [labelWidth + 0.086, labelHeight + 0.07, 0.042],
      color: '#484a3d',
    },
    ...[-1, 1].flatMap((side): Plate[] => [
      {
        at: [side * (labelWidth / 2 - 0.022), labelY - labelHeight / 2 + 0.035, z + 0.083],
        size: [0.082, 0.07, 0.033],
        color: look.frame,
      },
      {
        at: [side * (labelWidth / 2 - 0.022), labelY + labelHeight / 2 - 0.035, z + 0.083],
        size: [0.082, 0.07, 0.033],
        color: look.frame,
      },
    ]),
  ];
  if (drawer) {
    face.push(
      { at: [0, handleY, z + 0.127], size: [handleWidth, 0.092, 0.11], color: '#b0aa8e' },
      ...[-1, 1].flatMap((side): Plate[] => [
        {
          at: [side * (handleWidth / 2 - 0.044), handleY, z + 0.087],
          size: [0.095, 0.12, 0.143],
          color: look.frame,
        },
        {
          at: [side * (faceWidth / 2 - 0.105), -0.27, z - 0.22],
          size: [0.085, 0.119, 0.53],
          color: look.frame,
        },
      ]),
    );
  }
  if (look.form === 'sample') {
    face.push(
      ...[-0.14, 0, 0.14].map((shift): Plate => ({
        at: [shift, -height * 0.29, z + 0.067],
        size: [0.065, 0.2, 0.02],
        color: '#a6bcb1',
      })),
    );
  }
  const lid: Plate[] = drawer
    ? [{ at: [0, 0.105, depth * 0.52], size: [width * 0.8, 0.046, 0.115], color: look.frame }]
    : [
        { at: [0, 0.125, depth * 0.6], size: [width * 0.37, 0.072, 0.106], color: look.frame },
        ...[-1, 1].map((side): Plate => ({
          at: [side * (freight ? width * 0.29 : width * 0.16), 0.103, depth / 2],
          size: freight ? [0.18, 0.085, depth * 1.01] : [0.12, 0.14, depth * 0.25],
          color: look.frame,
        })),
      ];
  return { shell, face, lid, labelWidth, labelHeight, labelY, drawer };
}
