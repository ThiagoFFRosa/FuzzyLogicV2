import { describe, expect, it } from 'vitest';
import {
  ARM,
  chooseSupervisorTarget,
  limitSupervisorAim,
  solveSupervisorElbow,
} from './supervisor';

describe('factory supervisor', () => {
  it('watches the selected project, then pointer input, then scans and production during idle', () => {
    const current = {
      selected: false,
      hovered: false,
      reacting: false,
      recentPointer: true,
      scanning: true,
    };
    expect(chooseSupervisorTarget(current)).toBe('pointer');
    expect(chooseSupervisorTarget({ ...current, hovered: true })).toBe('hover');
    expect(chooseSupervisorTarget({ ...current, selected: true, hovered: true })).toBe('project');
    expect(chooseSupervisorTarget({ ...current, selected: true, reacting: true })).toBe('project');
    expect(chooseSupervisorTarget({ ...current, reacting: true })).toBe('visitor');
    expect(chooseSupervisorTarget({ ...current, recentPointer: false })).toBe('scanner');
    const idle = { ...current, recentPointer: false, scanning: false };
    expect(chooseSupervisorTarget({ ...idle, environment: true })).toBe('environment');
    expect(chooseSupervisorTarget({ ...idle, environment: true, scanning: true })).toBe('scanner');
    expect(chooseSupervisorTarget({ ...idle, environment: true, selected: true })).toBe('project');
    expect(chooseSupervisorTarget({ ...current, recentPointer: false, scanning: false })).toBe(
      'belt',
    );
  });

  it('limits tracking on the diagonal and preserves both arm lengths as the wrist moves', () => {
    const aim = limitSupervisorAim(3, 2, 0.35, 0.3);
    expect(Math.hypot(aim.yaw / 0.35, aim.pitch / 0.3)).toBeCloseTo(1);
    for (const [x, y] of [
      [0, 7.51],
      [-0.21, 7.44],
      [0.24, 7.58],
    ]) {
      const elbow = solveSupervisorElbow(x, y);
      expect(Math.hypot(elbow.x - ARM.shoulderX, elbow.y - ARM.shoulderY)).toBeCloseTo(ARM.upper);
      expect(Math.hypot(elbow.x - x, elbow.y - y)).toBeCloseTo(ARM.lower);
      expect(elbow.x).toBeLessThan(ARM.shoulderX);
    }
  });
});
