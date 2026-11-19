import { useEffect, useState } from 'react';

import type { Fix } from '../tracking/types';
import { testingManager } from './runtime';

export type SimulatedLocation =
  /** Simulation is off: the real device location applies. */
  | { mode: 'off'; fix: null }
  /** Simulation is on but its route is still loading: show no location yet. */
  | { mode: 'pending'; fix: null }
  /** Simulation is driving the app: this is where the phone "is". */
  | { mode: 'sim'; fix: Fix };

const OFF: SimulatedLocation = { mode: 'off', fix: null };
const PENDING: SimulatedLocation = { mode: 'pending', fix: null };

/**
 * Where the simulated phone is, for drawing the map. The native location
 * puck and `followUserLocation` read the OS location (the Simulator's own
 * fake spot, San Francisco by default), which is not the simulated drive, so
 * the map draws its own puck and moves its own camera from this.
 */
export function useSimulatedLocation(): SimulatedLocation {
  const enabled = testingManager.isEnabled();
  const [state, setState] = useState<SimulatedLocation>(enabled ? PENDING : OFF);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    void testingManager.ready().then((ok) => {
      if (cancelled) return;
      if (!ok) {
        // Could not load: the app falls back to real GPS, so the map must too.
        setState(OFF);
        return;
      }
      const first = testingManager.gps.currentFix();
      if (first) setState({ mode: 'sim', fix: first });
      stop = testingManager.gps.observe((fix) => setState({ mode: 'sim', fix }));
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled]);

  return state;
}
