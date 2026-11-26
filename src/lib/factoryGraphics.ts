import { renderPixelRatio } from './factoryQuality';
import type { FactoryQuality, QualityPreference } from './factoryQuality';

export const GRAPHICS_STORAGE_KEY = 'fuzzs-render-settings-v1';
export const RENDER_SCALES = [50, 60, 75, 85, 100, 125, 150, 175, 200] as const;
export const ANTIALIAS_MODES = ['off', 'fxaa', 'msaa'] as const;
export const SHADOW_LEVELS = ['off', 'low', 'medium', 'high', 'ultra'] as const;
export const TEXTURE_LEVELS = ['standard', 'high'] as const;
export const POST_MODES = ['off', 'bloom'] as const;
export const FRAME_LIMITS = [0, 30, 60, 120, 144, 165] as const;

export type GraphicsPreset = Exclude<QualityPreference, 'off'>;
export type Antialias = (typeof ANTIALIAS_MODES)[number];
export type ShadowQuality = (typeof SHADOW_LEVELS)[number];
export interface GraphicsSettings {
  scale: (typeof RENDER_SCALES)[number] | null;
  aa: Antialias;
  shadows: ShadowQuality;
  textures: (typeof TEXTURE_LEVELS)[number];
  post: (typeof POST_MODES)[number];
  fps: (typeof FRAME_LIMITS)[number];
  dynamic: boolean;
}

export type GraphicsOverrides = Partial<GraphicsSettings>;
export type GraphicsProfiles = Partial<Record<GraphicsPreset, GraphicsOverrides>>;

const fields = {
  scale: RENDER_SCALES,
  aa: ANTIALIAS_MODES,
  shadows: SHADOW_LEVELS,
  textures: TEXTURE_LEVELS,
  post: POST_MODES,
  fps: FRAME_LIMITS,
  dynamic: [true, false],
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
  tier: FactoryQuality,
  overrides: GraphicsOverrides,
): GraphicsSettings {
  const ultra = preset === 'ultra';
  return {
    scale: ultra ? 100 : null,
    aa: ultra ? 'msaa' : 'off',
    shadows: ultra ? 'ultra' : tier === 'low' ? 'off' : tier,
    textures: ultra ? 'high' : 'standard',
    post: 'off',
    fps: 0,
    dynamic: preset === 'auto',
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
const dynamicScale = { low: 0.6, medium: 0.85, high: 1 } as const;

export function resolveResolution(
  { width, height, device, compact, tier }: RasterArea,
  settings: GraphicsSettings,
  [maxWidth, maxHeight]: readonly [number, number],
) {
  const requestedDpr =
    settings.scale === null
      ? renderPixelRatio(tier, width, height, device, compact)
      : device * (settings.scale / 100) * (settings.dynamic ? dynamicScale[tier] : 1);
  const dpr = Math.min(
    requestedDpr,
    maxWidth / Math.max(width, 1),
    maxHeight / Math.max(height, 1),
  );
  return { dpr, requestedDpr, limited: dpr < requestedDpr };
}

export const SHADOW_INTERVALS: Record<ShadowQuality, number> = {
  off: 0,
  low: 1 / 8,
  medium: 1 / 12,
  high: 1 / 24,
  ultra: 1 / 60,
};

export function shadowMapSize(
  quality: ShadowQuality,
  zone: 'main' | 'outer' | 'service',
  compact: boolean,
) {
  if (quality === 'off') return 0;
  if (zone === 'outer')
    return compact || quality === 'low' || quality === 'medium'
      ? 0
      : quality === 'ultra'
        ? 1024
        : 512;
  if (zone === 'service')
    return compact || quality === 'low' || quality === 'medium'
      ? 0
      : quality === 'ultra'
        ? 512
        : 256;
  if (quality === 'low') return 256;
  if (quality === 'ultra') return 2048;
  return quality === 'high' && !compact ? 1024 : 512;
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
