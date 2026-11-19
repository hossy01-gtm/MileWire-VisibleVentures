/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DriveRecorder } from '../tracking/driveRecorder';
import { createLatchState, stepAutoLatch } from '../tracking/autoLatch';
import type { Fix } from '../tracking/types';
import { parseGpx } from './gpxParser';
import { buildRoute } from './routePlayback';
import { SimulatedGps } from './simulatedGps';

const GPX = resolve(__dirname, '../../../test-assets/developer/gpx-files/fisherville-to-fit4less.gpx');

/**
 * The point of the simulation: a GPX drive, played through the fake GPS, starts
 * Track mode by itself and is recorded as a sensible drive.
 */
describe('GPX simulation drives the tracking feature', () => {
  const route = buildRoute(parseGpx(readFileSync(GPX, 'utf8')))!;

  function playAll(): Fix[] {
    let clock = 5_000_000;
    const gps = new SimulatedGps({ intervalMs: 1000, speedMps: 20, accelMps2: 3, now: () => clock, setTimer: () => 'h', clearTimer: () => undefined });
    gps.load(route, 'playing');
    const fixes: Fix[] = [];
    gps.subscribe((f) => fixes.push(f));
    for (let i = 0; i < 5000 && gps.getSnapshot().status !== 'ended'; i++) {
      clock += 1000;
      gps.tick();
    }
    return fixes;
  }

  it('trips the auto-latch within a few fixes of setting off', () => {
    const fixes = playAll();
    let state = createLatchState(true);
    let latchedAt = -1;
    for (const [i, fix] of fixes.entries()) {
      const step = stepAutoLatch(state, { speed: fix.speed, accuracy: fix.accuracy, timestamp: fix.timestamp }, fix.timestamp);
      state = step.state;
      if (step.latch) {
        latchedAt = i;
        break;
      }
    }
    expect(latchedAt).toBeGreaterThanOrEqual(0);
    expect(latchedAt).toBeLessThan(6);
  });

  it('records the whole route: distance, moving time and speed', () => {
    const fixes = playAll();
    const rec = new DriveRecorder('sim', fixes[0].timestamp, null);
    for (const fix of fixes) rec.addFix(fix);
    const drive = rec.finalize(fixes[fixes.length - 1].timestamp);

    expect(drive.gpsSamples).toBe(fixes.length);
    expect(drive.gpsGaps).toBe(0);
    expect(drive.gpsPoorSamples).toBe(0);
    expect(drive.distanceM).toBeGreaterThan(route.totalM * 0.97);
    expect(drive.distanceM).toBeLessThanOrEqual(route.totalM * 1.001);
    expect(drive.maxSpeedMps).toBeLessThanOrEqual(20.001);
    expect(drive.maxSpeedMps).toBeGreaterThan(15);
    expect(drive.movingMs).toBeGreaterThan(0);
  });
});
