import { QUALITY_SCALES, renderPixelRatio } from './factoryQuality';
import type { FactoryQuality, QualityPreference } from './factoryQuality';

export const GRAPHICS_STORAGE_KEY = 'fuzzs-render-settings-v1';
export const RENDER_SCALES = Object.values(QUALITY_SCALES);
export const POST_MODES = ['off', 'bloom'] as const;
export const FRAME_LIMITS = [0, 30, 60, 120, 144, 165] as const;

export type GraphicsPreset = Exclude<QualityPreference, 'off'>;
export type Antialias = 'off' | 'fxaa' | 'msaa';
export interface GraphicsSettings {
  scale: (typeof RENDER_SCALES)[number] | null;
  post: (typeof POST_MODES)[number];
  fps: (typeof FRAME_LIMITS)[number];
}

export type GraphicsOverrides = Partial<Omit<GraphicsSettings, 'scale'>> & {
  scale?: NonNullable<GraphicsSettings['scale']>;
};
export type GraphicsProfiles = Partial<Record<GraphicsPreset, GraphicsOverrides>>;

const fields = {
  scale: RENDER_SCALES,
  post: POST_MODES,
  fps: FRAME_LIMITS,
} satisfies { [Key in keyof GraphicsSettings]: readonly GraphicsSettings[Key][] };

const presets = ['auto', 'low', 'medium', 'high', 'ultra'] as const;

export function parseGraphicsProfiles(json: string | null): GraphicsProfiles {
  let value: unknown;
  try {
    value = JSON.parse(json ?? 'null');
  } catch {
    return {};
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: GraphicsProfiles = {};
  for (const preset of presets) {
    const saved = (value as Record<string, unknown>)[preset];
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) continue;
    const entries = Object.entries(saved).filter(
      ([key, item]) =>
        Object.hasOwn(fields, key) &&
        (fields[key as keyof GraphicsSettings] as readonly unknown[]).includes(item),
    );
    if (entries.length) result[preset] = Object.fromEntries(entries);
  }
  return result;
}

export function graphicsSettings(
  preset: GraphicsPreset,
  overrides: GraphicsOverrides,
): GraphicsSettings {
  return {
    scale: preset === 'auto' ? null : QUALITY_SCALES[preset],
    post: 'off',
    fps: 0,
    ...overrides,
  };
}

type RasterArea = {
  width: number;
  height: number;
  device: number;
  compact: boolean;
  tier: FactoryQuality;
};
export function resolveResolution(
  { width, height, device, compact, tier }: RasterArea,
  settings: GraphicsSettings,
  [maxWidth, maxHeight]: readonly [number, number],
) {
  const requestedDpr =
    settings.scale === null
      ? renderPixelRatio(tier, width, height, device, compact)
      : device * (settings.scale / 100);
  const dpr = Math.min(
    requestedDpr,
    maxWidth / Math.max(width, 1),
    maxHeight / Math.max(height, 1),
  );
  return { dpr, requestedDpr, limited: dpr < requestedDpr };
}

export const SHADOW_INTERVAL = 1 / 24;
export const MAIN_SHADOW_SIZE = 1024;

export function shadowMapSize(zone: 'main' | 'outer' | 'service', compact: boolean) {
  if (zone === 'main') return MAIN_SHADOW_SIZE;
  if (compact) return 0;
  return zone === 'outer' ? 512 : 256;
}

export interface RenderReport {
  css: [number, number];
  physical: [number, number];
  buffer: [number, number];
  dpr: number;
  scale: number;
  effectiveAA: Antialias;
  samples: number;
  maxSamples: number;
  anisotropy: number;
  maxAnisotropy: number;
  post: GraphicsSettings['post'];
  dynamic: boolean;
  tier: FactoryQuality;
  limitations: ('resolution' | 'msaa' | 'post' | 'textures' | 'shadows')[];
  timing?: { fps: number | null; frameMs: number | null; cpuMs: number; gpuMs: number | null };
  draw?: { calls: number; triangles: number; geometries: number; textures: number; lights: number };
}
