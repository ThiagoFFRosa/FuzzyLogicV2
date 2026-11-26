import { useCallback, useEffect, useReducer, useState } from 'react';
import type { ComponentType } from 'react';
import {
  BOOT_REVEAL_MS,
  BOOT_TIMEOUT_MS,
  FactoryAssetError,
  bootReducer,
  bootStatus,
  initialBoot,
} from '../../../lib/factoryBoot';
import type { BootMilestone } from '../../../lib/factoryBoot';
import type { FactorySceneProps } from './FactoryScene';

export function useFacilityBoot(start: boolean, disabled: boolean, reduced: boolean) {
  const [state, dispatch] = useReducer(bootReducer, initialBoot);
  const [loaded, setLoaded] = useState<{
    attempt: number;
    Scene: ComponentType<FactorySceneProps>;
  }>();
  const { attempt, failure } = state;
  const status = bootStatus(state);
  const complete = useCallback(
    (milestone: BootMilestone) => dispatch({ type: 'complete', attempt, milestone }),
    [attempt],
  );
  const fail = useCallback(
    (error?: unknown) =>
      dispatch({
        type: 'fail',
        attempt,
        failure: error instanceof FactoryAssetError ? 'assets' : 'renderer',
      }),
    [attempt],
  );
  const reset = useCallback(() => dispatch({ type: 'restart' }), []);

  useEffect(() => {
    if (!start || disabled) return;
    let current = true;
    import('./FactoryScene').then(
      ({ default: Scene }) => {
        if (!current) return;
        setLoaded({ attempt, Scene });
        complete('module');
      },
      (error: unknown) => {
        if (current) fail(new FactoryAssetError(error));
      },
    );
    Promise.all([
      document.fonts.load('500 16px "Inter Variable"'),
      document.fonts.load('700 42px "Space Grotesk Variable"'),
    ]).then(
      () => {
        if (current) complete('fonts');
      },
      (error: unknown) => {
        if (current) fail(new FactoryAssetError(error));
      },
    );
    return () => {
      current = false;
    };
  }, [start, disabled, attempt, complete, fail]);

  const waiting = !failure && status.progress < 100;
  useEffect(() => {
    if (!start || disabled || !waiting) return;
    const timer = window.setTimeout(
      () => dispatch({ type: 'fail', attempt, failure: 'timeout' }),
      BOOT_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [start, disabled, waiting, attempt]);

  useEffect(() => {
    if (disabled || status.stage !== 'revealing') return;
    if (reduced) {
      dispatch({ type: 'reveal', attempt });
      return;
    }
    const timer = window.setTimeout(() => dispatch({ type: 'reveal', attempt }), BOOT_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [attempt, disabled, reduced, status.stage]);

  function retry() {
    // A browser can cache a failed ESM load for this document. A new navigation clears that entry.
    if (failure === 'assets') window.location.reload();
    else reset();
  }

  return {
    ...status,
    state,
    complete,
    fail,
    reset,
    retry,
    Scene: loaded?.attempt === attempt && state.done.fonts ? loaded.Scene : null,
  };
}
