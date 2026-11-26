type Tier = 'common' | 'uncommon' | 'rare';
export type EventId = 'dock' | 'gel' | 'lamp' | 'salvage' | 'turret' | 'window' | 'log';
type SectorPoint = readonly [number, number, number];

interface EventConfig {
  tier: Tier;
  duration: number;
  intensity: number;
  points: readonly SectorPoint[];
  desktop?: boolean;
}

export const EVENTS: Record<EventId, EventConfig> = {
  dock: {
    tier: 'common',
    duration: 2.2,
    intensity: 0.85,
    points: [
      [-19.6, 4.02, 3.17],
      [19.6, 4.02, 3.17],
    ],
  },
  gel: {
    tier: 'common',
    duration: 2.6,
    intensity: 0.13,
    points: [
      [2, 9.4, -6.85],
      [-9, 5.9, -6.7],
      [13, 5.8, -6.6],
    ],
  },
  lamp: { tier: 'uncommon', duration: 1.6, intensity: 0.25, points: [[-3, 7.8, 2.05]] },
  salvage: {
    tier: 'uncommon',
    duration: 1.55,
    intensity: 0.61,
    points: [[-11.25, -0.9, 7.18]],
    desktop: true,
  },
  turret: { tier: 'uncommon', duration: 1.7, intensity: 0.44, points: [[9, 1.8, 0]] },
  window: {
    tier: 'rare',
    duration: 2.3,
    intensity: 0.32,
    points: [
      [-3, 10.85, -9.58],
      [5, 11.15, -9.58],
      [13, 10.9, -9.58],
    ],
  },
  log: {
    tier: 'rare',
    duration: 3.8,
    intensity: 0.22,
    points: [[17.35, 4.95, 3.09]],
    desktop: true,
  },
};

const TIERS = ['rare', 'uncommon', 'common'] as const;
const TIMING = {
  common: { first: [7, 15], interval: [12, 26], chance: 0.87 },
  uncommon: { first: [22, 40], interval: [23, 57], chance: 0.76 },
  rare: { first: [76, 129], interval: [68, 140], chance: 0.29 },
} as const;
const IDS = Object.keys(EVENTS) as EventId[];
const RECOVERY_SECONDS = 3.5;

export interface AmbientOptions {
  enabled: boolean;
  mobile: boolean;
  compact: boolean;
  economy?: boolean;
}
export interface AmbientEvent {
  id: EventId;
  source: 'natural' | 'debug';
  startedAt: number;
  duration: number;
  intensity: number;
  sector: number;
  target: SectorPoint;
}

export class AmbientScheduler {
  time = 0;
  current: AmbientEvent | null = null;
  naturalCount = 0;
  private options: AmbientOptions = { enabled: false, compact: false, mobile: false };
  private readyAt = 0;
  private lastId: EventId | null = null;
  private next: Record<Tier, number>;

  constructor(private random = Math.random) {
    this.next = {
      common: this.between(TIMING.common.first),
      uncommon: this.between(TIMING.uncommon.first),
      rare: this.between(TIMING.rare.first),
    };
  }

  private between([min, max]: readonly [number, number]) {
    return min + this.random() * (max - min);
  }

  private available(id: EventId) {
    if (this.options.economy && (EVENTS[id].tier === 'rare' || id === 'salvage')) return false;
    return !EVENTS[id].desktop || !this.options.mobile;
  }

  private start(id: EventId, source: AmbientEvent['source']) {
    const { points, duration, intensity } = EVENTS[id];
    const sector =
      this.options.mobile && id === 'window' ? 1 : Math.floor(this.random() * points.length);
    this.current = {
      id,
      source,
      sector,
      target: points[sector],
      startedAt: this.time,
      duration,
      intensity: intensity * (this.options.compact ? 0.72 : 1),
    };
    if (source === 'natural') this.naturalCount++;
    this.lastId = id;
  }

  step(delta: number, options: AmbientOptions) {
    const wasEnabled = this.options.enabled;
    this.options = options;
    if (!options.enabled) {
      if (this.current) this.readyAt = this.time + RECOVERY_SECONDS;
      this.current = null;
      return;
    }
    if (wasEnabled) this.time += Math.max(0, Math.min(delta, 0.5));
    if (this.current) {
      if (this.progress(this.current.id) >= 1 || !this.available(this.current.id)) {
        this.current = null;
        this.readyAt = this.time + RECOVERY_SECONDS;
      }
      return;
    }
    if (this.time < this.readyAt) return;
    for (const tier of TIERS) {
      if (this.time < this.next[tier]) continue;
      const { interval, chance } = TIMING[tier];
      this.next[tier] = this.time + this.between(interval);
      if (this.random() >= chance) continue;
      const eligible = IDS.filter((id) => EVENTS[id].tier === tier && this.available(id));
      const alternatives = eligible.filter((id) => id !== this.lastId);
      const pool = alternatives.length ? alternatives : eligible;
      if (pool.length) {
        this.start(pool[Math.floor(this.random() * pool.length)], 'natural');
        return;
      }
    }
  }

  trigger(id: EventId) {
    if (!this.options.enabled || this.current || !Object.hasOwn(EVENTS, id) || !this.available(id))
      return false;
    this.start(id, 'debug');
    return true;
  }

  get enabled() {
    return this.options.enabled;
  }

  progress(id: EventId) {
    const event = this.current;
    return event?.id === id ? Math.min(1, (this.time - event.startedAt) / event.duration) : 0;
  }

  strength(id: EventId) {
    const event = this.current;
    if (event?.id !== id) return 0;
    return event.intensity * Math.sin(Math.PI * this.progress(id)) ** 2;
  }
}
