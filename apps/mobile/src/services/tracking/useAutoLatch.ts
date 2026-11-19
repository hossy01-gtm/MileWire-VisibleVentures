import { useEffect, useRef, useState } from 'react';

import { watchIdleFixes } from '../location/locationService';
import {
  createLatchState,
  disarmLatch,
  isConfirming,
  resetLatchConfidence,
  stepAutoLatch,
  type LatchState,
} from './autoLatch';

type Options = {
  /** The map is focused, the app is in the foreground and location is allowed. */
  enabled: boolean;
  /** A Track mode session is starting, running or stopping (by any route). */
  sessionActive: boolean;
  /** Fired once when the phone reaches driving speed. Start tracking here. */
  onLatch: () => void;
};

type Result = {
  /** Latest ground speed in m/s while the idle watcher is running. */
  speedMps: number | null;
  /** A fix at driving speed has been seen and the latch is confirming. */
  confirming: boolean;
};

/**
 * Watches GPS speed while the map is idle and fires `onLatch` when the phone
 * is clearly driving (see `autoLatch.ts`). Stops as soon as a session starts,
 * and stays disarmed until the driver has actually stopped again, so ending a
 * drive at speed does not immediately restart it.
 */
export function useAutoLatch({ enabled, sessionActive, onLatch }: Options): Result {
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const stateRef = useRef<LatchState>(createLatchState(true));
  const onLatchRef = useRef(onLatch);
  useEffect(() => {
    onLatchRef.current = onLatch;
  });

  // However a session started (latch, hold, resume), the latch is spent until
  // the driver has stopped again.
  useEffect(() => {
    if (sessionActive) stateRef.current = disarmLatch();
  }, [sessionActive]);

  const watching = enabled && !sessionActive;
  useEffect(() => {
    if (!watching) return;
    stateRef.current = resetLatchConfidence(stateRef.current);

    let cancelled = false;
    let stop: (() => void) | null = null;
    void watchIdleFixes((fix) => {
      if (cancelled) return;
      setSpeedMps(fix.speed);
      const step = stepAutoLatch(
        stateRef.current,
        { speed: fix.speed, accuracy: fix.accuracy, timestamp: fix.timestamp },
        Date.now(),
      );
      stateRef.current = step.state;
      setConfirming(isConfirming(step.state));
      if (step.latch) onLatchRef.current();
    })
      .then((watch) => {
        if (cancelled) watch.stop();
        else stop = watch.stop;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      stop?.();
      setSpeedMps(null);
      setConfirming(false);
    };
  }, [watching]);

  return { speedMps, confirming };
}
