const milestones = [
  ['module', 22],
  ['fonts', 14],
  ['renderer', 18],
  ['scene', 27],
  ['frame', 19],
] as const;

export type BootMilestone = (typeof milestones)[number][0];
export type BootFailure = 'assets' | 'renderer' | 'timeout';
export const BOOT_TIMEOUT_MS = 35_000;
export const BOOT_REVEAL_MS = 520;

interface BootState {
  attempt: number;
  done: Partial<Record<BootMilestone, true>>;
  failure: BootFailure | null;
  revealed: boolean;
}

export const initialBoot: BootState = { attempt: 0, done: {}, failure: null, revealed: false };

type BootEvent =
  | { type: 'restart' }
  | { type: 'complete'; attempt: number; milestone: BootMilestone }
  | { type: 'fail'; attempt: number; failure: BootFailure }
  | { type: 'reveal'; attempt: number };

export function bootReducer(state: BootState, event: BootEvent): BootState {
  if (event.type === 'restart') return { ...initialBoot, attempt: state.attempt + 1 };
  if (state.attempt !== event.attempt || state.failure) return state;
  if (event.type === 'fail') return { ...state, failure: event.failure };
  if (event.type === 'reveal')
    return milestones.every(([name]) => state.done[name]) ? { ...state, revealed: true } : state;
  if (state.done[event.milestone]) return state;
  return { ...state, done: { ...state.done, [event.milestone]: true } };
}

export function bootStatus(state: BootState) {
  const progress = milestones.reduce(
    (sum, [name, weight]) => sum + (state.done[name] ? weight : 0),
    0,
  );
  const pending = milestones.find(([name]) => !state.done[name])?.[0];
  const stage = state.failure ? 'error' : (pending ?? (state.revealed ? 'running' : 'revealing'));
  return { stage, progress };
}

export class FactoryAssetError extends Error {
  constructor(cause: unknown) {
    super('The factory asset could not be prepared.', { cause });
  }
}
