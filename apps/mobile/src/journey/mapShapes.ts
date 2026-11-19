import type { PathPoint } from '@/services/tracking/types';

/** GeoJSON line for a recorded path ([lat, lon, …] -> [lon, lat]). */
export function pathToLine(path: readonly PathPoint[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: path.map((p) => [p[1], p[0]]) },
  };
}

/** Start and end markers for a finished path. */
export function endpoints(path: readonly PathPoint[]) {
  const pts = path.length > 1 ? [path[0], path[path.length - 1]] : path.length === 1 ? [path[0]] : [];
  return {
    type: 'FeatureCollection' as const,
    features: pts.map((p, i) => ({
      type: 'Feature' as const,
      properties: { kind: i === 0 ? 'start' : 'end' },
      geometry: { type: 'Point' as const, coordinates: [p[1], p[0]] },
    })),
  };
}

/** [sw, ne] corners around a path, widened a little when the path is a single spot. */
export function pathBounds(path: readonly PathPoint[]): { sw: [number, number]; ne: [number, number] } | null {
  if (path.length === 0) return null;
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  for (const p of path) {
    w = Math.min(w, p[1]);
    e = Math.max(e, p[1]);
    s = Math.min(s, p[0]);
    n = Math.max(n, p[0]);
  }
  const pad = e - w < 1e-4 && n - s < 1e-4 ? 0.002 : 0;
  return { sw: [w - pad, s - pad], ne: [e + pad, n + pad] };
}
