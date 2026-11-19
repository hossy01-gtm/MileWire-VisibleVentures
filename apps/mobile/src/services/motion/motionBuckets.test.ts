import { describe, expect, it } from 'vitest';

import { MotionBucketer, downsampleMotion, type MotionPoint } from './motionBuckets';

describe('MotionBucketer', () => {
  it('keeps the peak deviation from 1 g and the peak gyro within each second', () => {
    const b = new MotionBucketer();
    expect(b.add(1000, 1.02, 0.1)).toBeNull();
    expect(b.add(1100, 0.55, 0.4)).toBeNull(); // |0.55 − 1| = 0.45 is the peak
    expect(b.add(1900, 1.1, 0.2)).toBeNull();
    // the first sample of the next second closes the previous bucket
    expect(b.add(2000, 1.0, 0)).toEqual([1000, 0.45, 0.4]);
    expect(b.flush()).toEqual([2000, 0, 0]);
  });

  it('starts clean after a flush and flushing nothing returns null', () => {
    const b = new MotionBucketer();
    expect(b.flush()).toBeNull();
    b.add(5000, 1.7, 2);
    expect(b.flush()).toEqual([5000, 0.7, 2]);
    expect(b.flush()).toBeNull();
    b.add(9000, 1.0, 0);
    expect(b.flush()).toEqual([9000, 0, 0]);
  });

  it('emits one bucket per elapsed second even across a quiet gap', () => {
    const b = new MotionBucketer();
    b.add(0, 1.4, 0);
    expect(b.add(7300, 1.0, 0)).toEqual([0, 0.4, 0]);
  });
});

describe('downsampleMotion', () => {
  const series: MotionPoint[] = Array.from({ length: 1000 }, (_, i) => [i * 1000, i === 437 ? 1.9 : 0.05, i === 812 ? 7 : 0.1]);

  it('leaves short series untouched (as a copy)', () => {
    const small = series.slice(0, 5);
    const out = downsampleMotion(small, 300);
    expect(out).toEqual(small);
    expect(out[0]).not.toBe(small[0]);
  });

  it('merges down to the cap while keeping the biggest bump and spin', () => {
    const out = downsampleMotion(series, 300);
    expect(out).toHaveLength(300);
    expect(Math.max(...out.map((p) => p[1]))).toBe(1.9);
    expect(Math.max(...out.map((p) => p[2]))).toBe(7);
    expect(out[0][0]).toBe(0);
    // timestamps stay increasing
    for (let i = 1; i < out.length; i++) expect(out[i][0]).toBeGreaterThan(out[i - 1][0]);
  });
});
