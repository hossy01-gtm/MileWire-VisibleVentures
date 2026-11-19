import { describe, expect, it } from 'vitest';

import { classifyJoltSeverity, scoreJoltConfidence, tryDetectJolt } from './joltDetector';
import type { MotionData } from './types';

const sample = (t: number, magnitude: number, gyro = 0): MotionData => ({
  timestamp: t,
  accelerometer: { x: 0, y: 0, z: magnitude, magnitude },
  gyroscope: { x: gyro, y: 0, z: 0 },
});

/** 10 Hz quiet driving around 1 g. */
const quiet = (from: number, n: number) => Array.from({ length: n }, (_, i) => sample(from + i * 100, 1.02));

describe('tryDetectJolt', () => {
  it('ignores quiet driving', () => {
    const buf = quiet(0, 20);
    expect(tryDetectJolt(buf, 0)).toMatchObject({ detected: false, reason: 'peak_below_threshold' });
  });

  it('needs at least two samples', () => {
    expect(tryDetectJolt([sample(0, 1)], 0)).toMatchObject({ detected: false, reason: 'insufficient_samples' });
  });

  it('fires on a sharp short spike and classifies severity', () => {
    const buf = [...quiet(0, 10), sample(1000, 1.5, 0.6)];
    const r = tryDetectJolt(buf, 0);
    expect(r.detected).toBe(true);
    if (r.detected) {
      expect(r.severity).toBe('medium');
      expect(r.features.peak_dev).toBeCloseTo(0.5, 5);
      // gyro co-occurrence + high jerk + short duration all boost confidence
      expect(r.confidence).toBeGreaterThan(0.9);
    }
  });

  it('counts one physical impact once (cooldown)', () => {
    const first = [...quiet(0, 10), sample(1000, 1.5)];
    const r1 = tryDetectJolt(first, 0);
    expect(r1.detected).toBe(true);
    const second = [...first, sample(1100, 1.55)];
    expect(tryDetectJolt(second, 1000)).toMatchObject({ detected: false, reason: 'cooldown' });
  });

  it('rejects a slow rise (jerk too low)', () => {
    const buf = [...quiet(0, 10), sample(1000, 1.32)];
    // Δmag = 0.30 over 100 ms = 3 g/s from quiet, so make the prior sample close to it
    buf[buf.length - 2] = sample(900, 1.29);
    expect(tryDetectJolt(buf, 0)).toMatchObject({ detected: false, reason: 'jerk_below_threshold' });
  });

  it('treats a long sample gap as a sensor pause', () => {
    const buf = [...quiet(0, 10), sample(2000, 1.6)];
    expect(tryDetectJolt(buf, 0)).toMatchObject({ detected: false, reason: 'sample_gap' });
  });

  it('rejects sustained elevation (not an impact)', () => {
    const buf = [...quiet(0, 5)];
    for (let i = 0; i < 9; i++) buf.push(sample(500 + i * 100, 1.2));
    buf.push(sample(1400, 1.6));
    expect(tryDetectJolt(buf, 0)).toMatchObject({ detected: false, reason: 'duration_exceeded' });
  });
});

describe('severity + confidence', () => {
  it('bands on peak deviation', () => {
    expect(classifyJoltSeverity(0.31)).toBe('low');
    expect(classifyJoltSeverity(0.4)).toBe('medium');
    expect(classifyJoltSeverity(0.6)).toBe('high');
  });
  it('clamps confidence to 0..1', () => {
    expect(scoreJoltConfidence({ jerk: 9, gyroMag: 9, durationMs: 10 })).toBeLessThanOrEqual(1);
    expect(scoreJoltConfidence({ jerk: 0, gyroMag: 0, durationMs: 999 })).toBeCloseTo(0.55);
  });
});
