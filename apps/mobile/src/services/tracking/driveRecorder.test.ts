import { describe, expect, it } from 'vitest';

import { haversineM } from '@/lib/geo';

import { STORED_MOTION_MAX } from '../motion/motionBuckets';
import { DriveRecorder, STORED_PATH_MAX } from './driveRecorder';
import type { Fix } from './types';

const T0 = 1_700_000_000_000;
// ~11.1 m per 0.0001° of latitude
const fix = (i: number, over: Partial<Fix> = {}): Fix => ({
  lat: 43.65 + i * 0.0001,
  lon: -79.38,
  accuracy: 5,
  speed: 11,
  heading: 0,
  timestamp: T0 + i * 1000,
  ...over,
});

const jolt = (t: number) => ({
  timestamp: t,
  magnitude: 1.5,
  severity: 'medium' as const,
  confidence: 0.8,
  detector_version: 'jolt-detector-v1',
  features: { peak_dev: 0.5, jerk: 5, gyro_mag: 0.1, duration_ms: 100, sample_count: 3 },
});

describe('DriveRecorder', () => {
  it('accumulates distance along a straight drive', () => {
    const r = new DriveRecorder('a', T0, null);
    for (let i = 0; i < 60; i++) r.addFix(fix(i));
    const s = r.snapshot(T0 + 59_000);
    const expected = haversineM({ lat: 43.65, lon: -79.38 }, { lat: 43.65 + 59 * 0.0001, lon: -79.38 });
    expect(s.distanceM).toBeCloseTo(expected, 0);
    expect(s.maxSpeedMps).toBe(11);
    expect(s.movingMs).toBe(59_000);
    expect(s.avgSpeedMps).toBeCloseTo(expected / 59, 1);
    expect(s.gpsSamples).toBe(60);
  });

  it('drops low-accuracy fixes without counting them', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    expect(r.addFix(fix(1, { accuracy: 120 }))).toBe('rejected');
    expect(r.snapshot(T0 + 1000).gpsSamples).toBe(1);
  });

  it('flags poor (30–50 m) fixes but keeps them', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    expect(r.addFix(fix(1, { accuracy: 40 }))).toBe('accepted');
    expect(r.snapshot(T0 + 1000).gpsPoorSamples).toBe(1);
  });

  it('rejects an implausible GPS jump and recovers on the next fix', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    // ~11 km in one second
    expect(r.addFix(fix(1, { lat: 43.75 }))).toBe('rejected');
    expect(r.addFix(fix(2))).toBe('accepted');
    expect(r.snapshot(T0 + 2000).distanceM).toBeLessThan(30);
  });

  it('ignores stationary jitter', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0, { speed: 0 }));
    for (let i = 1; i < 30; i++) {
      // ±1 m wobble, reported speed 0
      r.addFix({ ...fix(i, { speed: 0 }), lat: 43.65 + (i % 2) * 0.00001 });
    }
    const s = r.snapshot(T0 + 30_000);
    expect(s.distanceM).toBe(0);
    expect(s.movingMs).toBe(0);
  });

  it('counts GPS gaps over 5 s and does not credit them as moving time', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    r.addFix(fix(30)); // 30 s later, ~330 m
    const s = r.snapshot(T0 + 30_000);
    expect(s.gpsGaps).toBe(1);
    expect(s.movingMs).toBe(0);
  });

  it('records jolts with position, capping stored events but not the count', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    for (let i = 0; i < 130; i++) r.addJolt(jolt(T0 + i));
    const s = r.snapshot(T0 + 1000);
    expect(s.joltCount).toBe(130);
    expect(s.jolts).toHaveLength(100);
    expect(s.jolts[0]).toMatchObject({ lat: 43.65, severity: 'medium', peakDev: 0.5 });
  });

  it('finalize seals the drive and thins the stored path', () => {
    const r = new DriveRecorder('a', T0, 'fleet-1');
    for (let i = 0; i < 2000; i++) r.addFix(fix(i, { timestamp: T0 + i * 4000 }));
    const done = r.finalize(T0 + 2000 * 4000);
    expect(done.status).toBe('completed');
    expect(done.fleetId).toBe('fleet-1');
    expect(done.path.length).toBeLessThanOrEqual(STORED_PATH_MAX);
    expect(done.path[0][0]).toBe(43.65);
    expect(done.path[done.path.length - 1][0]).toBeCloseTo(43.65 + 1999 * 0.0001, 6);
    expect(done.endedAt).toBe(T0 + 2000 * 4000);
  });

  it('keeps motion buckets and seals them down to the stored cap, peaks intact', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    for (let i = 0; i < 1500; i++) r.addMotion([T0 + i * 1000, i === 700 ? 1.4 : 0.05, 0.1]);
    expect(r.snapshot(T0 + 5000).motion).toHaveLength(1500);
    const done = r.finalize(T0 + 1500 * 1000);
    expect(done.motion).toHaveLength(STORED_MOTION_MAX);
    expect(Math.max(...done.motion!.map((p) => p[1]))).toBe(1.4);
  });

  it('bounds live motion on a very long drive without losing the biggest peak', () => {
    const r = new DriveRecorder('a', T0, null);
    r.addFix(fix(0));
    for (let i = 0; i < 9000; i++) r.addMotion([T0 + i * 1000, i === 8000 ? 2.5 : 0.05, 0.1]);
    const live = r.snapshot(T0 + 9_000_000).motion!;
    expect(live.length).toBeLessThanOrEqual(4000);
    expect(Math.max(...live.map((p) => p[1]))).toBe(2.5);
  });
});
