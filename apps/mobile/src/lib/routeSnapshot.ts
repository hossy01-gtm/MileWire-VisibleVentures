import type { PathPoint } from '@/services/tracking/types';

import { thinPath } from './geo';

export type SnapshotPoint = { x: number; y: number };

export type RouteSnapshotLayout = {
  /** Route vertices in pixel space, first to last. One point for a drive that never moved. */
  points: SnapshotPoint[];
  start: SnapshotPoint;
  end: SnapshotPoint;
};

/** Below this span (degrees, about 10 cm) a route is a single spot. */
const MIN_SPAN_DEG = 1e-6;

/**
 * Fit a recorded path into a `width` x `height` box for a small route
 * thumbnail: aspect-correct (longitude is scaled by cos(latitude)), centred,
 * north up, with `padding` kept clear on every side. Pure, so it is unit
 * tested; the drawing lives in `RouteSnapshot.tsx`.
 */
export function layoutRouteSnapshot(
  path: readonly PathPoint[],
  size: { width: number; height: number },
  padding: number,
  maxPoints = 40,
): RouteSnapshotLayout | null {
  if (path.length === 0) return null;
  const pts = thinPath(path, maxPoints);

  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const p of pts) {
    minLat = Math.min(minLat, p[0]);
    maxLat = Math.max(maxLat, p[0]);
    minLon = Math.min(minLon, p[1]);
    maxLon = Math.max(maxLon, p[1]);
  }

  const centre = { x: size.width / 2, y: size.height / 2 };
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLon - minLon) * kx;
  const spanY = maxLat - minLat;
  if (spanX < MIN_SPAN_DEG && spanY < MIN_SPAN_DEG) {
    return { points: [centre], start: centre, end: centre };
  }

  const availW = Math.max(size.width - padding * 2, 1);
  const availH = Math.max(size.height - padding * 2, 1);
  const scale = Math.min(spanX > 0 ? availW / spanX : Infinity, spanY > 0 ? availH / spanY : Infinity);
  const offX = (size.width - spanX * scale) / 2;
  const offY = (size.height - spanY * scale) / 2;

  const points = pts.map((p) => ({
    x: offX + (p[1] - minLon) * kx * scale,
    y: offY + (maxLat - p[0]) * scale,
  }));
  return { points, start: points[0], end: points[points.length - 1] };
}

export type Segment = {
  /** Centre of the segment. */
  cx: number;
  cy: number;
  length: number;
  /** Radians, clockwise from the x axis (screen coordinates). */
  angle: number;
};

/** Straight segments between consecutive vertices; zero-length hops are dropped. */
export function toSegments(points: readonly SnapshotPoint[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.25) continue;
    out.push({ cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, length, angle: Math.atan2(dy, dx) });
  }
  return out;
}
