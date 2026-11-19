import type { PathPoint } from "./types";

const R = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing a→b in degrees clockwise from north (0–360). */
export function bearingDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const y = Math.sin(rad(bLon - aLon)) * Math.cos(rad(bLat));
  const x = Math.cos(rad(aLat)) * Math.sin(rad(bLat)) - Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLon - aLon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** [west, south, east, north] or null for an empty set. */
export function boundsOf(points: ReadonlyArray<{ lat: number; lon: number }>): [number, number, number, number] | null {
  if (points.length === 0) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lon); e = Math.max(e, p.lon);
    s = Math.min(s, p.lat); n = Math.max(n, p.lat);
  }
  return [w, s, e, n];
}

export const pathToLonLat = (path: readonly PathPoint[]): [number, number][] => path.map((p) => [p[1], p[0]]);

/** Pose at time t by linear interpolation along the recorded path. */
export type Pose = { lat: number; lon: number; headingDeg: number | null; speedMps: number; index: number };

export function poseAt(path: readonly PathPoint[], t: number): Pose | null {
  if (path.length === 0) return null;
  if (t <= path[0][2]) return { lat: path[0][0], lon: path[0][1], headingDeg: headingAt(path, 0), speedMps: path[0][3], index: 0 };
  const last = path.length - 1;
  if (t >= path[last][2]) return { lat: path[last][0], lon: path[last][1], headingDeg: headingAt(path, last), speedMps: path[last][3], index: last };
  // Binary search for the segment containing t.
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid][2] <= t) lo = mid; else hi = mid;
  }
  const a = path[lo], b = path[hi];
  const span = b[2] - a[2];
  const f = span > 0 ? (t - a[2]) / span : 0;
  return {
    lat: a[0] + (b[0] - a[0]) * f,
    lon: a[1] + (b[1] - a[1]) * f,
    headingDeg: headingAt(path, lo),
    speedMps: a[3] + (b[3] - a[3]) * f,
    index: lo,
  };
}

/** Heading of the segment starting at `i` (falls back to the previous one at the end). */
export function headingAt(path: readonly PathPoint[], i: number): number | null {
  if (path.length < 2) return null;
  const from = Math.min(i, path.length - 2);
  const a = path[from], b = path[from + 1];
  if (haversineM(a[0], a[1], b[0], b[1]) < 1) return from > 0 ? headingAt(path, from - 1) : null;
  return bearingDeg(a[0], a[1], b[0], b[1]);
}
