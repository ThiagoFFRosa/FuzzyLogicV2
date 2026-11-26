import { expect, it } from 'vitest';
import { inspectionReducer, crateInspectionPose, OPEN_MS } from './inspection';
import type { InspectionSession } from './inspection';

const start = (id: number, index: number): InspectionSession => ({
  id,
  index,
  startedAt: 100,
  closingAt: null,
  phase: 'opening',
  origin: { kind: 'crate', left: 60, top: 90, width: 100, height: 64 },
});

it('changes project immediately and discards events from superseded inspections', () => {
  const first = inspectionReducer(null, { type: 'select', session: start(1, 0) });
  expect(inspectionReducer(first, { type: 'select', session: start(2, 0) })).toBe(first);
  const second = inspectionReducer(first, { type: 'select', session: start(3, 1) });
  expect(second?.index).toBe(1);
  expect(inspectionReducer(second, { type: 'settle', id: 1 })).toBe(second);
  expect(inspectionReducer(second, { type: 'settle', id: 3 })?.phase).toBe('inspecting');
});

it('opens the latches before the lid and reverses a partially opened crate without a jump', () => {
  const session = start(1, 0);
  const early = crateInspectionPose(session, 186, false);
  expect(early.latches).toBeGreaterThan(0.5);
  expect(early.lid).toBe(0);
  const closed = inspectionReducer(session, { type: 'close', id: 1, at: 315, immediate: false });
  expect(crateInspectionPose(closed!, 315, false)).toEqual(
    crateInspectionPose(session, 315, false),
  );
  expect(crateInspectionPose(closed!, 600, false).lid).toBe(0);
  expect(crateInspectionPose(session, 100 + OPEN_MS, false).lid).toBe(1);
  expect(inspectionReducer(closed, { type: 'finish', id: 1 })).toBeNull();
});

it('opens immediately with reduced motion and bypasses 3D animation for offscreen crates', () => {
  const session = start(1, 0);
  expect(crateInspectionPose(session, 100, true).lid).toBe(1);
  const fallback = { ...session, origin: { ...session.origin, kind: 'control' as const } };
  expect(crateInspectionPose(fallback, 700, false).lid).toBe(0);
});
