import { describe, it, expect } from 'vitest';
import { pointerOffset, resolveLocale, readPreference, savePreference } from './behavior';
describe('preferences and optical tracking', () => {
  it('detects Portuguese and falls back to English', () => {
    expect(resolveLocale(null, 'pt-PT')).toBe('pt');
    expect(resolveLocale(null, 'de-DE')).toBe('en');
    expect(resolveLocale('en', 'pt-BR')).toBe('en');
  });
  it('ignores corrupted preferences', () => {
    expect(resolveLocale('invalid', 'pt-BR')).toBe('pt');
  });
  it('survives blocked storage', () => {
    const storage = {
      getItem() {
        throw Error();
      },
      setItem() {
        throw Error();
      },
    };
    expect(readPreference(storage, 'theme')).toBe(null);
    expect(() => savePreference(storage, 'theme', 'amber')).not.toThrow();
  });
  it('limits gaze radially and rests in the center', () => {
    expect(pointerOffset(0, 0)).toEqual({ x: 0, y: 0 });
    const p = pointerOffset(9000, 9000);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(44);
  });
});
