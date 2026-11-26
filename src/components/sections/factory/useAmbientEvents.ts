import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AmbientScheduler } from '../../../lib/ambientEvents';
import type { AmbientOptions, EventId } from '../../../lib/ambientEvents';

type DebugWindow = Window & {
  __fuzzsAmbient?: {
    trigger: (id: EventId) => boolean;
    snapshot: () => {
      enabled: boolean;
      time: number;
      current: AmbientScheduler['current'];
      naturalCount: number;
    };
  };
};

export function useAmbientEvents(options: AmbientOptions) {
  const [scheduler] = useState(() => new AmbientScheduler());
  const { enabled, mobile, compact, economy } = options;
  const settings = useMemo(
    () => ({ enabled, mobile, compact, economy }),
    [enabled, mobile, compact, economy],
  );
  useLayoutEffect(() => scheduler.step(0, settings), [scheduler, settings]);
  useFrame((_, delta) => scheduler.step(delta, settings), -3);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const target = window as DebugWindow;
    const debug = {
      trigger: (id: EventId) => !document.hidden && scheduler.trigger(id),
      snapshot: () => ({
        enabled: scheduler.enabled,
        time: scheduler.time,
        current: scheduler.current,
        naturalCount: scheduler.naturalCount,
      }),
    };
    target.__fuzzsAmbient = debug;
    return () => {
      if (target.__fuzzsAmbient === debug) delete target.__fuzzsAmbient;
    };
  }, [scheduler]);

  return scheduler;
}
