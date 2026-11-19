import { haversineM } from '@/lib/geo';

import type { LatLon } from './types';

/** A polyline with cumulative distances, ready to be walked. */
export type Route = {
  points: LatLon[];
  /** cum[i] = metres from the start to points[i]. */
  cum: number[];
  /** Initial bearing (degrees clockwise from north) of the segment starting at points[i]. */
  bearings: number[];
  totalM: number;
};

export type PlaybackState = {
  /** Metres travelled along the route. */
  distanceM: number;
  /** Current speed, m/s. */
  speedMps: number;
  done: boolean;
};

export type PlaybackOptions = { speedMps: number; accelMps2: number };

/** Within this many metres of the end, with the brakes on, the drive is over. */
const ARRIVE_M = 0.5;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function bearingDeg(a: LatLon, b: LatLon): number {
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Build a walkable route. Consecutive duplicate points (the captured `usercap-`
 * files start with a run of identical waypoints) are dropped. Returns null when
 * fewer than two distinct points remain: there is nothing to drive.
 */
export function buildRoute(input: readonly LatLon[]): Route | null {
  const points: LatLon[] = [];
  for (const p of input) {
    const last = points[points.length - 1];
    if (!last || haversineM(last, p) > 0.01) points.push(p);
  }
  if (points.length < 2) return null;
  const cum = [0];
  const bearings: number[] = [];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineM(points[i - 1], points[i]));
    bearings.push(bearingDeg(points[i - 1], points[i]));
  }
  bearings.push(bearings[bearings.length - 1]);
  return { points, cum, bearings, totalM: cum[cum.length - 1] };
}

/** Position and heading `distanceM` metres along the route (clamped to its ends). */
export function positionAt(route: Route, distanceM: number): LatLon & { heading: number } {
  const d = Math.min(Math.max(distanceM, 0), route.totalM);
  let lo = 0;
  let hi = route.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (route.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const segLen = route.cum[hi] - route.cum[lo];
  const t = segLen > 0 ? (d - route.cum[lo]) / segLen : 0;
  const a = route.points[lo];
  const b = route.points[hi];
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, heading: route.bearings[lo] };
}

export function initialPlayback(): PlaybackState {
  return { distanceM: 0, speedMps: 0, done: false };
}

/**
 * Advance the drive by `dtS` seconds: accelerate from rest, cruise, and brake so
 * the vehicle comes to a stop exactly at the end of the route. Deterministic,
 * so the same route and options always produce the same drive.
 */
export function stepPlayback(route: Route, state: PlaybackState, dtS: number, opts: PlaybackOptions): PlaybackState {
  if (state.done) return state;
  const remaining = route.totalM - state.distanceM;
  // The fastest speed from which the brakes can still stop us at the end.
  const brakingCap = Math.sqrt(2 * opts.accelMps2 * Math.max(remaining, 0));
  const target = Math.min(opts.speedMps, brakingCap);
  const maxDelta = opts.accelMps2 * dtS;
  const speedMps = Math.max(0, state.speedMps + Math.max(-maxDelta, Math.min(maxDelta, target - state.speedMps)));
  const distanceM = Math.min(route.totalM, state.distanceM + ((state.speedMps + speedMps) / 2) * dtS);
  if (route.totalM - distanceM <= ARRIVE_M) return { distanceM: route.totalM, speedMps: 0, done: true };
  return { distanceM, speedMps, done: false };
}
