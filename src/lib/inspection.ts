export const OPEN_MS = 520;
export const CLOSE_MS = 270;
export const PANEL_RELEASE_MS = 156;
export const INSPECTION_EASE = 'cubic-bezier(0.22, 0.78, 0.24, 1)';

export interface InspectionOrigin {
  kind: 'crate' | 'control';
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ProjectAnchor {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  visible: boolean;
}

export interface InspectionSession {
  id: number;
  index: number;
  phase: 'opening' | 'inspecting' | 'closing';
  startedAt: number;
  closingAt: number | null;
  origin: InspectionOrigin;
}

type InspectionEvent =
  | { type: 'select'; session: InspectionSession }
  | { type: 'settle' | 'finish'; id: number }
  | { type: 'close'; id: number; at: number; immediate: boolean };

export function inspectionReducer(
  state: InspectionSession | null,
  event: InspectionEvent,
): InspectionSession | null {
  if (event.type === 'select') {
    return state?.index === event.session.index && state.phase !== 'closing'
      ? state
      : event.session;
  }
  if (!state || state.id !== event.id) return state;
  if (event.type === 'close' && state.phase !== 'closing') {
    return event.immediate ? null : { ...state, phase: 'closing', closingAt: event.at };
  }
  if (event.type === 'settle' && state.phase === 'opening')
    return { ...state, phase: 'inspecting' };
  if (event.type === 'finish' && state.phase === 'closing') return null;
  return state;
}

function ease(value: number, from: number, to: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

export const CLOSED_CRATE = { lid: 0, latches: 0, face: 0, light: 0 };
const OPEN_CRATE = { lid: 1, latches: 1, face: 1, light: 1 };

function openingPose(age: number) {
  return {
    latches: ease(age, 25, 122),
    lid: ease(age, 104, 420),
    face: ease(age, 169, 452),
    light: ease(age, 124, 350),
  };
}

export function crateInspectionPose(session: InspectionSession, now: number, reduced: boolean) {
  if (session.origin.kind !== 'crate') return CLOSED_CRATE;
  if (reduced) return session.phase === 'closing' ? CLOSED_CRATE : OPEN_CRATE;
  if (session.closingAt === null) return openingPose(now - session.startedAt);
  const from = openingPose(session.closingAt - session.startedAt);
  const age = now - session.closingAt;
  return {
    face: from.face * (1 - ease(age, 0, 147)),
    light: from.light * (1 - ease(age, 35, 182)),
    lid: from.lid * (1 - ease(age, 28, 216)),
    latches: from.latches * (1 - ease(age, 165, CLOSE_MS)),
  };
}

export function crateOrigin(
  anchor: ProjectAnchor | undefined,
  canvas: DOMRect,
): InspectionOrigin | null {
  if (
    !anchor?.visible ||
    Math.abs(anchor.viewportWidth - canvas.width) > 2 ||
    Math.abs(anchor.viewportHeight - canvas.height) > 2
  )
    return null;
  const left = canvas.left + anchor.left;
  const top = canvas.top + anchor.top;
  const centerX = left + anchor.width / 2;
  const centerY = top + anchor.height / 2;
  if (centerX <= 0 || centerX >= innerWidth || centerY < 0 || centerY >= innerHeight) return null;
  return {
    kind: 'crate',
    left: left + window.scrollX,
    top: top + window.scrollY,
    width: anchor.width,
    height: anchor.height,
  };
}
