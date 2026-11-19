const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export type LatLon = { lat: number; lon: number };

/** Great-circle distance in metres. */
export function haversineM(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Down-sample a path to at most `max` points, always keeping the first and
 * last point. Even stride — cheap and good enough for a display polyline.
 */
export function thinPath<T>(path: readonly T[], max: number): T[] {
  if (max < 2 || path.length <= max) return path.slice();
  const out: T[] = [];
  const step = (path.length - 1) / (max - 1);
  for (let i = 0; i < max - 1; i++) out.push(path[Math.round(i * step)]);
  out.push(path[path.length - 1]);
  return out;
}

/** [west, south, east, north] of a set of points, or null when empty. */
export function boundsOf(points: readonly LatLon[]): [number, number, number, number] | null {
  if (points.length === 0) return null;
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  for (const p of points) {
    w = Math.min(w, p.lon);
    e = Math.max(e, p.lon);
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
  }
  return [w, s, e, n];
}
