import { describe, expect, it } from 'vitest';

import {
  LATCH_CONSECUTIVE,
  LATCH_DWELL_MS,
  LATCH_SAMPLE_MAX_GAP_MS,
  LATCH_SPEED_MPS,
  createLatchState,
  disarmLatch,
  isConfirming,
  resetLatchConfidence,
  stepAutoLatch,
  type LatchSample,
  type LatchState,
} from './autoLatch';

const NOW = 1_000_000;
const FAST = LATCH_SPEED_MPS + 1;
const SLOW = 1;

/** Feed fixes one second apart, each "just received". Returns the final step. */
function feed(state: LatchState, speeds: (number | null)[], opts: { start?: number; every?: number; accuracy?: number | null } = {}) {
  const every = opts.every ?? 1_000;
  let t = opts.start ?? NOW;
  let latched = false;
  let s = state;
  for (const speed of speeds) {
    const sample: LatchSample = { speed, accuracy: opts.accuracy ?? 5, timestamp: t };
    const step = stepAutoLatch(s, sample, t);
    s = step.state;
    latched = latched || step.latch;
    t += every;
  }
  return { state: s, latched, next: t };
}

describe('auto-latch', () => {
  it('uses 10 km/h as the threshold', () => {
    expect(LATCH_SPEED_MPS).toBeCloseTo(2.7778, 3);
  });

  it('latches after three consecutive fixes at driving speed', () => {
    const first = feed(createLatchState(), [FAST, FAST]);
    expect(first.latched).toBe(false);
    expect(isConfirming(first.state)).toBe(true);
    const third = feed(first.state, [FAST], { start: first.next });
    expect(third.latched).toBe(true);
  });

  it('does not latch below the threshold', () => {
    const r = feed(createLatchState(), Array(10).fill(SLOW));
    expect(r.latched).toBe(false);
    expect(isConfirming(r.state)).toBe(false);
  });

  it('a slow fix resets the consecutive run', () => {
    const r = feed(createLatchState(), [FAST, FAST, SLOW, FAST, FAST]);
    expect(r.latched).toBe(false);
  });

  it('latches on sustained dwell even with sparse fixes', () => {
    // Two fixes five seconds apart are enough: the dwell clause.
    const r = feed(createLatchState(), [FAST, FAST], { every: LATCH_DWELL_MS });
    expect(r.latched).toBe(true);
  });

  it('disarms after a latch and needs a real stopped episode to re-arm', () => {
    const latched = feed(createLatchState(), Array(LATCH_CONSECUTIVE).fill(FAST));
    expect(latched.latched).toBe(true);
    expect(latched.state.armed).toBe(false);

    // Still driving fast: never latches again.
    const still = feed(latched.state, Array(10).fill(FAST), { start: latched.next });
    expect(still.latched).toBe(false);

    // Stopped for three fixes, then moving again: latches.
    const stopped = feed(still.state, Array(LATCH_CONSECUTIVE).fill(SLOW), { start: still.next });
    expect(stopped.state.armed).toBe(true);
    const again = feed(stopped.state, Array(LATCH_CONSECUTIVE).fill(FAST), { start: stopped.next });
    expect(again.latched).toBe(true);
  });

  it('disarmLatch (a hold-started session) blocks an immediate re-latch at speed', () => {
    const r = feed(disarmLatch(), Array(6).fill(FAST));
    expect(r.latched).toBe(false);
  });

  it('keeps armed across a confidence reset (screen blur)', () => {
    const mid = feed(createLatchState(), [FAST, FAST]);
    const reset = resetLatchConfidence(mid.state);
    expect(reset.armed).toBe(true);
    expect(reset.above).toBe(0);
  });

  it('ignores stale fixes', () => {
    const stale: LatchSample = { speed: FAST, accuracy: 5, timestamp: NOW - 10_000 };
    const step = stepAutoLatch(createLatchState(), stale, NOW);
    expect(step.latch).toBe(false);
    expect(step.state.above).toBe(0);
  });

  it('ignores replayed (non-advancing) timestamps', () => {
    const sample: LatchSample = { speed: FAST, accuracy: 5, timestamp: NOW };
    const one = stepAutoLatch(createLatchState(), sample, NOW);
    const replay = stepAutoLatch(one.state, sample, NOW + 100);
    expect(replay.state.above).toBe(1);
  });

  it('drops confidence after a long gap between fixes', () => {
    const r = feed(createLatchState(), [FAST, FAST]);
    const late: LatchSample = { speed: FAST, accuracy: 5, timestamp: r.next + LATCH_SAMPLE_MAX_GAP_MS + 1 };
    const step = stepAutoLatch(r.state, late, late.timestamp);
    expect(step.latch).toBe(false);
    expect(step.state.above).toBe(1);
  });

  it('treats missing speed and poor accuracy as no evidence either way', () => {
    const noSpeed = feed(createLatchState(), [FAST, FAST, null, FAST]);
    expect(noSpeed.latched).toBe(false);
    expect(noSpeed.state.armed).toBe(true);

    const poor = feed(createLatchState(), Array(5).fill(FAST), { accuracy: 120 });
    expect(poor.latched).toBe(false);
  });

  it('a bad fix does not re-arm a disarmed latch', () => {
    const r = feed(disarmLatch(), [null, null, null, null]);
    expect(r.state.armed).toBe(false);
  });
});
