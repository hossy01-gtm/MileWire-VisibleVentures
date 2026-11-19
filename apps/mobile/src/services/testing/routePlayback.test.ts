import { describe, expect, it } from 'vitest';

import { haversineM } from '@/lib/geo';

import { buildRoute, initialPlayback, positionAt, stepPlayback, type PlaybackOptions } from './routePlayback';

// ~1.11 km due north along a meridian.
const NORTH = [
  { lat: 43.0, lon: -79.0 },
  { lat: 43.005, lon: -79.0 },
  { lat: 43.01, lon: -79.0 },
];
const OPTS: PlaybackOptions = { speedMps: 20, accelMps2: 3 };

describe('buildRoute', () => {
  it('measures cumulative distance and bearing', () => {
    const route = buildRoute(NORTH)!;
    expect(route.totalM).toBeCloseTo(haversineM(NORTH[0], NORTH[2]), 0);
    expect(route.bearings[0]).toBeCloseTo(0, 3);
  });

  it('drops consecutive duplicates (captured files start with a run of them)', () => {
    const route = buildRoute([NORTH[0], NORTH[0], NORTH[0], NORTH[1]])!;
    expect(route.points).toHaveLength(2);
  });

  it('returns null when there is nothing to drive', () => {
    expect(buildRoute([])).toBeNull();
    expect(buildRoute([NORTH[0]])).toBeNull();
    expect(buildRoute([NORTH[0], NORTH[0]])).toBeNull();
  });
});

describe('positionAt', () => {
  it('interpolates, and clamps to both ends', () => {
    const route = buildRoute(NORTH)!;
    expect(positionAt(route, -5)).toMatchObject({ lat: 43.0, lon: -79.0 });
    expect(positionAt(route, route.totalM / 2).lat).toBeCloseTo(43.005, 4);
    expect(positionAt(route, 1e9).lat).toBeCloseTo(43.01, 6);
  });
});

describe('stepPlayback', () => {
  function drive(route: NonNullable<ReturnType<typeof buildRoute>>, opts = OPTS) {
    const speeds: number[] = [];
    let state = initialPlayback();
    for (let i = 0; i < 10_000 && !state.done; i++) {
      state = stepPlayback(route, state, 1, opts);
      speeds.push(state.speedMps);
    }
    return { state, speeds };
  }

  it('starts from rest, accelerating no faster than the limit', () => {
    const route = buildRoute(NORTH)!;
    const first = stepPlayback(route, initialPlayback(), 1, OPTS);
    expect(first.speedMps).toBeCloseTo(3);
    expect(first.distanceM).toBeCloseTo(1.5);
  });

  it('cruises at the target speed, never above it, and stops exactly at the end', () => {
    const route = buildRoute(NORTH)!;
    const { state, speeds } = drive(route);
    expect(state.done).toBe(true);
    expect(state.distanceM).toBe(route.totalM);
    expect(state.speedMps).toBe(0);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(20);
    expect(speeds).toContain(20);
  });

  it('never brakes harder than the limit', () => {
    const route = buildRoute(NORTH)!;
    const { speeds } = drive(route);
    for (let i = 1; i < speeds.length - 1; i++) expect(speeds[i - 1] - speeds[i]).toBeLessThanOrEqual(3 + 1e-9);
  });

  it('finishes very short routes too', () => {
    const route = buildRoute([NORTH[0], { lat: 43.00005, lon: -79.0 }])!; // ~5.5 m
    expect(drive(route).state.done).toBe(true);
  });

  it('is deterministic and inert once done', () => {
    const route = buildRoute(NORTH)!;
    expect(drive(route).state).toEqual(drive(route).state);
    const done = drive(route).state;
    expect(stepPlayback(route, done, 1, OPTS)).toBe(done);
  });
});
