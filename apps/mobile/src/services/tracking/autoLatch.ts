/**
 * Auto-latch: Track mode starts by itself once the phone is clearly moving at
 * driving speed. Pure state machine, no React and no platform imports, so it
 * is unit-tested directly (`autoLatch.test.ts`) and driven by `useAutoLatch`.
 *
 * A drive latches after `LATCH_CONSECUTIVE` fresh fixes in a row at or above
 * `LATCH_SPEED_MPS`, or once the speed has stayed above it for `LATCH_DWELL_MS`.
 * After a latch (or any other way a session started) the latch is disarmed: it
 * re-arms only after a real stopped episode, so ending a drive at speed or
 * returning to the map mid-drive never restarts tracking by itself.
 */

/** 10 km/h in m/s. */
export const LATCH_SPEED_MPS = 10 / 3.6;
export const LATCH_CONSECUTIVE = 3;
export const LATCH_DWELL_MS = 5_000;
/** A fix older than this is not evidence of movement right now. */
export const LATCH_SAMPLE_MAX_AGE_MS = 6_000;
/** A longer silence between fixes drops any confidence built so far. */
export const LATCH_SAMPLE_MAX_GAP_MS = 6_000;
/** Fixes less precise than this (metres) say nothing reliable about speed. */
export const LATCH_MAX_ACCURACY_M = 50;

export type LatchSample = {
  /** Ground speed in m/s; null when the platform has no valid reading. */
  speed: number | null;
  /** Horizontal accuracy in metres; null when unknown. */
  accuracy: number | null;
  /** Epoch milliseconds the fix was taken. */
  timestamp: number;
};

export type LatchState = {
  /** Whether reaching driving speed may start a session right now. */
  armed: boolean;
  /** Consecutive fixes at/above the latch speed. */
  above: number;
  aboveSince: number | null;
  /** Consecutive fixes below the latch speed (counts toward re-arming). */
  below: number;
  belowSince: number | null;
  lastTimestamp: number | null;
};

export function createLatchState(armed = true): LatchState {
  return { armed, above: 0, aboveSince: null, below: 0, belowSince: null, lastTimestamp: null };
}

/** Forget in-flight confidence (screen left, app backgrounded) but keep `armed`. */
export function resetLatchConfidence(state: LatchState): LatchState {
  return createLatchState(state.armed);
}

/** Disarm after a session started: a fresh stopped episode must come first. */
export function disarmLatch(): LatchState {
  return createLatchState(false);
}

export function isFreshSample(sample: LatchSample, nowMs: number, lastTimestamp: number | null): boolean {
  if (!Number.isFinite(sample.timestamp)) return false;
  if (sample.timestamp > nowMs + 1_000) return false; // clock skew tolerance
  if (nowMs - sample.timestamp > LATCH_SAMPLE_MAX_AGE_MS) return false;
  return lastTimestamp == null || sample.timestamp > lastTimestamp;
}

export type LatchStep = {
  state: LatchState;
  /** True on the one fix that tips the latch: start tracking now. */
  latch: boolean;
};

/** Feed one GPS fix. Pure: returns the next state and whether to latch. */
export function stepAutoLatch(state: LatchState, sample: LatchSample, nowMs: number): LatchStep {
  // Stale or replayed fixes change nothing.
  if (!isFreshSample(sample, nowMs, state.lastTimestamp)) return { state, latch: false };

  // A long silence means we cannot vouch for continuity.
  let base = state;
  if (state.lastTimestamp != null && sample.timestamp - state.lastTimestamp > LATCH_SAMPLE_MAX_GAP_MS) {
    base = { ...createLatchState(state.armed) };
  }

  const speed = sample.speed;
  const speedValid = typeof speed === 'number' && Number.isFinite(speed) && speed >= 0;
  const accurate = sample.accuracy == null || sample.accuracy <= LATCH_MAX_ACCURACY_M;
  if (!speedValid || !accurate) {
    // Drop confidence, but a bad fix is not proof the driver stopped, so the
    // armed flag is left alone.
    return { state: { ...createLatchState(base.armed), lastTimestamp: sample.timestamp }, latch: false };
  }

  if (speed < LATCH_SPEED_MPS) {
    const below = base.below + 1;
    const belowSince = base.belowSince ?? sample.timestamp;
    const stopped = below >= LATCH_CONSECUTIVE || sample.timestamp - belowSince >= LATCH_DWELL_MS;
    return {
      state: {
        armed: base.armed || stopped,
        above: 0,
        aboveSince: null,
        below,
        belowSince,
        lastTimestamp: sample.timestamp,
      },
      latch: false,
    };
  }

  const above = base.above + 1;
  const aboveSince = base.aboveSince ?? sample.timestamp;
  const confirmed = above >= LATCH_CONSECUTIVE || sample.timestamp - aboveSince >= LATCH_DWELL_MS;
  if (base.armed && confirmed) {
    return { state: { ...createLatchState(false), lastTimestamp: sample.timestamp }, latch: true };
  }
  return {
    state: { armed: base.armed, above, aboveSince, below: 0, belowSince: null, lastTimestamp: sample.timestamp },
    latch: false,
  };
}

/** True while an armed latch has seen at least one fix at driving speed. */
export function isConfirming(state: LatchState): boolean {
  return state.armed && state.above > 0;
}
