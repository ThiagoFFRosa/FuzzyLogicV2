import { expect, it } from 'vitest';
import { bootReducer, bootStatus, initialBoot } from './factoryBoot';
import type { BootMilestone } from './factoryBoot';

it('reports only completed milestones and requires a rendered frame before finishing', () => {
  let boot = initialBoot;
  for (const milestone of ['fonts', 'module', 'renderer', 'scene'] as BootMilestone[]) {
    boot = bootReducer(boot, { type: 'complete', milestone, attempt: 0 });
    expect(bootStatus(boot).progress).toBeLessThan(100);
  }
  expect(bootStatus(boot).stage).toBe('frame');
  boot = bootReducer(boot, { type: 'complete', milestone: 'frame', attempt: 0 });
  expect(bootStatus(boot)).toEqual({ stage: 'revealing', progress: 100 });
  boot = bootReducer(boot, { type: 'reveal', attempt: 0 });
  expect(bootStatus(boot).stage).toBe('running');
});

it('holds failures until retry and ignores late results from the previous attempt', () => {
  const failed = bootReducer(initialBoot, { type: 'fail', failure: 'timeout', attempt: 0 });
  expect(bootStatus(failed).stage).toBe('error');
  expect(bootReducer(failed, { type: 'complete', milestone: 'module', attempt: 0 })).toBe(failed);
  const retry = bootReducer(failed, { type: 'restart' });
  expect(bootReducer(retry, { type: 'complete', milestone: 'frame', attempt: 0 })).toBe(retry);
  expect(bootStatus(retry)).toEqual({ stage: 'module', progress: 0 });
});
