import { CAMERA_PROFILES, productionCamera } from '../../../../lib/factoryCamera';
import type {
  CameraConfiguration,
  CameraProfile,
  CameraVector,
} from '../../../../lib/factoryCamera';

export const profileLabels: Record<CameraProfile, string> = {
  desktop: 'Desktop',
  ultrawide: 'Ultrawide',
  'mobile-portrait': 'Mobile portrait',
  'mobile-landscape': 'Mobile landscape',
  tablet: 'Tablet',
};

export const viewports = {
  '16:9': [1600, 900],
  '16:10': [1440, 900],
  '21:9': [2520, 1080],
  '32:9': [3840, 1080],
  '9:16': [432, 768],
  '4:3': [1024, 768],
  'Mobile landscape': [688, 387],
} as const;
export type Viewport = keyof typeof viewports;

export const opticalFields = {
  fov: { label: 'FOV', min: 1, max: 150, step: 0.1 },
  zoom: { label: 'Zoom', min: 0.05, max: 10, step: 0.01 },
  near: { label: 'Near', min: 0.001, max: 1000, step: 0.001 },
  far: { label: 'Far', min: 0.002, max: 10000, step: 0.1 },
  roll: { label: 'Roll (°)', min: -180, max: 180, step: 0.1 },
};
export const coordinateLimit = 1000;

export function defaultProfile(profile: CameraProfile): CameraConfiguration {
  // Canvas ratios include the hero's navbar offset, minimum height and mobile scene band.
  const aspects: Record<CameraProfile, number> = {
    desktop: 1600 / 821,
    ultrawide: 3840 / 1001,
    'mobile-portrait': 390 / (844 * 0.38),
    'mobile-landscape': (688 * 0.71) / (387 * 0.56),
    tablet: 1024 / 820,
  };
  return productionCamera(
    aspects[profile],
    profile === 'mobile-portrait' || profile === 'mobile-landscape',
    profile,
  ).camera;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function readConfiguration(value: unknown): CameraConfiguration {
  if (!isRecord(value)) throw new Error('Expected a camera configuration object.');
  const profile = CAMERA_PROFILES.find((candidate) => candidate === value.profile);
  if (!profile) throw new Error('Choose a valid device profile.');
  const vector = (field: 'position' | 'target'): CameraVector => {
    const entries = value[field];
    if (
      !Array.isArray(entries) ||
      entries.length !== 3 ||
      !entries.every(
        (entry) =>
          typeof entry === 'number' && Number.isFinite(entry) && Math.abs(entry) <= coordinateLimit,
      )
    )
      throw new Error(`${field} must contain three coordinates between ±${coordinateLimit}.`);
    return [entries[0], entries[1], entries[2]];
  };
  const position = vector('position');
  const target = vector('target');
  if (Math.hypot(...position.map((entry, index) => entry - target[index])) < 0.01)
    throw new Error('Position and target must be at least 0.01 units apart.');
  const optics = Object.fromEntries(
    Object.entries(opticalFields).map(([field, { label, min, max }]) => {
      const number = value[field];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max)
        throw new Error(`${label} must be between ${min} and ${max}.`);
      return [field, number];
    }),
  ) as Pick<CameraConfiguration, keyof typeof opticalFields>;
  if (optics.near >= optics.far) throw new Error('Near must be smaller than Far.');
  return { profile, position, target, ...optics };
}

export function importConfigurations(json: string): CameraConfiguration[] {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('Paste valid JSON exported by Camera Studio.');
  }
  if (!isRecord(value) || 'profile' in value) return [readConfiguration(value)];
  const keys = Object.keys(value);
  if (!keys.length || keys.some((key) => !CAMERA_PROFILES.some((profile) => profile === key)))
    throw new Error('Expected a camera configuration or a map of device profiles.');
  return keys.map((key) => {
    const config = readConfiguration(value[key]);
    if (config.profile !== key)
      throw new Error(`The configuration for ${key} has a different profile.`);
    return config;
  });
}

export function serializeConfiguration(
  value: CameraConfiguration | Record<CameraProfile, CameraConfiguration>,
  format: 'json' | 'ts',
): string {
  const json = JSON.stringify(value, null, 2);
  return format === 'json'
    ? json
    : `export const ${'profile' in value ? 'camera' : 'cameras'} = ${json} satisfies ${'profile' in value ? 'CameraConfiguration' : 'Record<CameraProfile, CameraConfiguration>'};`;
}
