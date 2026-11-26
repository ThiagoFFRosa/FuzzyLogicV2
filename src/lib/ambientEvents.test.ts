import { expect, it } from 'vitest';
import { AmbientScheduler, EVENTS } from './ambientEvents';
const desktop = { enabled: true, mobile: false, compact: false };

it('schedules all three tiers naturally, respects recovery, and plays only one event at a time', () => {
  const scheduler = new AmbientScheduler(() => 0);
  const seen = new Set<string>();
  let lastEnd = 0;
  let previous: string | null = null;
  for (let i = 0; i < 600; i++) {
    scheduler.step(0.5, desktop);
    const event = scheduler.current;
    if (!event && previous) lastEnd = scheduler.time;
    if (event && event.id !== previous) {
      expect(event.source).toBe('natural');
      if (lastEnd > 0) expect(scheduler.time - lastEnd).toBeGreaterThanOrEqual(3.5);
      seen.add(EVENTS[event.id].tier);
    }
    previous = event?.id ?? null;
  }
  expect(seen).toEqual(new Set(['common', 'uncommon', 'rare']));
});

it('suspends the clock and refuses hidden or incompatible debug events', () => {
  const scheduler = new AmbientScheduler(() => 0.5);
  scheduler.step(0.25, desktop);
  expect(scheduler.trigger('salvage')).toBe(true);
  expect(scheduler.trigger('lamp')).toBe(false);
  const current = scheduler.time;
  scheduler.step(60, { ...desktop, enabled: false });
  expect(scheduler.time).toBe(current);
  expect(scheduler.current).toBeNull();
  expect(scheduler.trigger('lamp')).toBe(false);
  scheduler.step(0.25, { ...desktop, mobile: true, compact: true });
  expect(scheduler.trigger('salvage')).toBe(false);
  expect(scheduler.trigger('window')).toBe(true);
  expect(scheduler.current?.source).toBe('debug');
  expect(scheduler.current?.intensity).toBeLessThan(EVENTS.window.intensity);
});
