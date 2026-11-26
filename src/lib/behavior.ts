export type Locale = 'pt' | 'en';
export type CoreTheme = 'blue' | 'amber';
export const GAZE_LIMIT = 44;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function readPreference(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
export function savePreference(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* Preferences remain available in memory. */
  }
}
export function resolveLocale(saved: string | null, browser: string): Locale {
  return saved === 'pt' || saved === 'en'
    ? saved
    : browser.toLowerCase().startsWith('pt')
      ? 'pt'
      : 'en';
}
export function pointerOffset(dx: number, dy: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  const scale = distance ? Math.min(distance * 0.11, GAZE_LIMIT) / distance : 0;
  return { x: dx * scale, y: dy * scale };
}
export function browserPreference(key: string): string | null {
  try {
    return readPreference(window.localStorage, key);
  } catch {
    return null;
  }
}
export function persist(key: string, value: string): void {
  try {
    savePreference(window.localStorage, key, value);
  } catch {
    /* Storage access can be disabled. */
  }
}
