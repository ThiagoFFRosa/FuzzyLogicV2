export const QUALITY_STORAGE_KEY = 'fuzzs-quality';
export const QUALITY_LEVELS = ['low', 'medium', 'high'] as const;
export type FactoryQuality = (typeof QUALITY_LEVELS)[number];
export type QualityPreference = FactoryQuality | 'auto' | 'ultra' | 'off';

export const QUALITY_PROFILES = {
  low: { dpr: 0.6, maxPixels: 550_000 },
  medium: { dpr: 0.9, maxPixels: 1_200_000 },
  high: { dpr: 1.5, maxPixels: 2_500_000 },
} as const;

export function parseFactoryQuality(value: string | null): QualityPreference {
  return value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'ultra' ||
    value === 'off'
    ? value
    : 'auto';
}

export function initialFactoryQuality(width: number, maxTextureSize = Infinity): FactoryQuality {
  return width < 700 || maxTextureSize <= 4096 ? 'low' : 'medium';
}

export function renderPixelRatio(
  quality: FactoryQuality,
  width: number,
  height: number,
  device: number,
  compact = false,
) {
  const { dpr, maxPixels } = QUALITY_PROFILES[quality];
  const budget = compact ? Math.min(maxPixels, 720_000) : maxPixels;
  return Math.min(dpr, device, Math.sqrt(budget / Math.max(1, width * height)));
}

export class AdaptiveQuality {
  private seconds = 0;
  private windowsUntilPromotion = 3;
  private changeAfter = 0;
  private promoteAfter = 0;
  private frames = 0;
  private duration = 0;
  private late = 0;

  constructor(
    public level: FactoryQuality,
    private ceiling: FactoryQuality = 'high',
  ) {}

  resetWindow() {
    this.frames = 0;
    this.duration = 0;
    this.late = 0;
  }

  sample(delta: number) {
    if (delta <= 0) return this.level;
    this.seconds += Math.min(delta, 0.5);
    this.duration += delta;
    this.frames++;
    if (delta > 0.05) this.late++;
    if (this.duration < 2.5 || this.frames < 8) return this.level;

    const index = QUALITY_LEVELS.indexOf(this.level);
    const slow =
      this.duration / this.frames > (this.level === 'high' ? 0.026 : 0.037) ||
      this.late / this.frames >= 0.25;
    const fast = this.duration / this.frames < 0.019 && this.late === 0;
    this.resetWindow();
    this.windowsUntilPromotion = fast ? Math.max(0, this.windowsUntilPromotion - 1) : 3;
    if (this.seconds < this.changeAfter) return this.level;

    if (slow && index > 0) {
      this.level = QUALITY_LEVELS[index - 1];
      this.changeAfter = this.seconds + 6;
      this.promoteAfter = this.seconds + 24;
    } else if (
      this.windowsUntilPromotion === 0 &&
      this.seconds >= this.promoteAfter &&
      index < QUALITY_LEVELS.indexOf(this.ceiling)
    ) {
      this.level = QUALITY_LEVELS[index + 1];
      this.changeAfter = this.seconds + 6;
      this.windowsUntilPromotion = 3;
    }
    return this.level;
  }
}
