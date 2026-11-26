import type { IndustrialPoint } from '../../../lib/industrialPath';
import type { TurretVariant } from './FactoryTurret';

export interface ConveyorRoute {
  id: string;
  points: IndustrialPoint[];
  width: number;
  speed: number;
  cargo: { variant: TurretVariant; start: number }[];
}

export const CONVEYOR_ROUTES: ConveyorRoute[] = [
  {
    id: 'upper-transfer',
    points: [
      [-25, 6.9, -10.2],
      [-19, 6.9, -6.2],
      [-13, 7.1, -5.55],
      [-5, 8.28, -5.75],
      [2, 8.24, -6.85],
      [7.8, 8.04, -6.85],
      [14, 7.35, -5.8],
      [19, 7.45, -5.95],
      [24, 7.85, -10.4],
    ],
    width: 1.45,
    speed: 0.78,
    cargo: [
      { variant: 'active', start: 0.36 },
      { variant: 'sleeping', start: 0.7 },
    ],
  },
  {
    id: 'maintenance-return',
    points: [
      [22, 3.0, -10.4],
      [16, 3.02, -6.75],
      [10.5, 2.85, -6.26],
      [4.5, 2.65, -6.45],
      [-2, 2.95, -5.35],
      [-8, 3.58, -5.45],
      [-14, 3.38, -5.68],
      [-18, 2.95, -6.82],
      [-23, 2.7, -10.5],
    ],
    width: 1.25,
    speed: 0.53,
    cargo: [
      { variant: 'damaged', start: 0.62 },
      { variant: 'sleeping', start: 0.3 },
    ],
  },
];

export interface FluidCircuit {
  id: 'GEL-B' | 'GEL-A' | 'GEL-W';
  points: IndustrialPoint[];
  radius: number;
  glass: [number, number];
  paint: string;
  color: string;
  speed: number;
  density: number;
  emission: number;
  opacity: number;
  pump: IndustrialPoint;
  gauge: IndustrialPoint;
}

export const FLUID_CIRCUITS: FluidCircuit[] = [
  {
    id: 'GEL-B',
    points: [
      [-19, 14, -8.9],
      [-18.5, 11.5, -6.7],
      [-16.7, 9.8, -6.7],
      [-12, 9.47, -6.85],
      [-3, 9.42, -6.85],
      [6, 9.43, -6.85],
      [13.15, 9.52, -6.85],
      [17.8, 9.42, -6.85],
      [19, 8.8, -6.85],
      [19.05, 6.4, -6.85],
      [19.05, 4.73, -7.25],
      [19.05, 4.55, -9.6],
    ],
    radius: 0.43,
    glass: [0.41, 0.52],
    paint: '#425c61',
    color: '#197bac',
    speed: 0.81,
    density: 0.62,
    emission: 0.44,
    opacity: 0.24,
    pump: [19.05, 6.45, -6.85],
    gauge: [19.05, 6.63, -6.35],
  },
  {
    id: 'GEL-A',
    points: [
      [-20, 6.12, -10],
      [-18.5, 6.1, -6.75],
      [-15.8, 5.95, -6.58],
      [-10.1, 5.86, -6.63],
      [-6.3, 5.89, -6.72],
      [-4.75, 5.42, -6.9],
      [-4.4, 4.15, -7.02],
      [-4.39, 1.0, -7.04],
      [-4.38, -2.3, -7.04],
    ],
    radius: 0.37,
    glass: [0.43, 0.59],
    paint: '#625943',
    color: '#c38639',
    speed: 0.61,
    density: 0.55,
    emission: 0.37,
    opacity: 0.17,
    pump: [-4.4, 1.2, -7.03],
    gauge: [-4.4, 1.38, -6.57],
  },
  {
    id: 'GEL-W',
    points: [
      [6.25, -2.2, -7],
      [6.25, 1.5, -7.1],
      [6.25, 3.9, -7.1],
      [6.9, 5.45, -6.77],
      [9.45, 5.82, -6.7],
      [14, 5.85, -6.62],
      [18, 5.85, -6.62],
      [20.7, 5.85, -6.08],
      [23.5, 5.85, -6.11],
      [26.8, 5.85, -9.9],
    ],
    radius: 0.32,
    glass: [0.43, 0.56],
    paint: '#576962',
    color: '#bbc7bd',
    speed: 0.42,
    density: 0.87,
    emission: 0.19,
    opacity: 0.32,
    pump: [6.25, 1.5, -7.09],
    gauge: [6.25, 1.68, -6.65],
  },
];
