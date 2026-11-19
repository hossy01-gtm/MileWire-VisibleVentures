import { describe, expect, it } from 'vitest';

import type { PathPoint } from '@/services/tracking/types';

import { layoutRouteSnapshot, toSegments } from './routeSnapshot';

const pt = (lat: number, lon: number): PathPoint => [lat, lon, 0, 0];
const SIZE = { width: 80, height: 80 };

describe('layoutRouteSnapshot', () => {
  it('returns null for an empty path', () => {
    expect(layoutRouteSnapshot([], SIZE, 10)).toBeNull();
  });

  it('collapses a drive that never moved to one centred point', () => {
    const l = layoutRouteSnapshot([pt(43.7, -79.4), pt(43.7, -79.4)], SIZE, 10)!;
    expect(l.points).toEqual([{ x: 40, y: 40 }]);
    expect(l.start).toEqual(l.end);
  });

  it('draws north up: moving north goes toward the top of the box', () => {
    const l = layoutRouteSnapshot([pt(43.0, -79.4), pt(43.01, -79.4)], SIZE, 10)!;
    expect(l.start.y).toBeGreaterThan(l.end.y);
    expect(l.start.x).toBeCloseTo(l.end.x, 5);
  });

  it('keeps every point inside the padded box and centres the shape', () => {
    const path = [pt(43.0, -79.5), pt(43.004, -79.49), pt(43.002, -79.47), pt(43.008, -79.46)];
    const l = layoutRouteSnapshot(path, SIZE, 10)!;
    for (const p of l.points) {
      expect(p.x).toBeGreaterThanOrEqual(10 - 1e-6);
      expect(p.x).toBeLessThanOrEqual(70 + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(10 - 1e-6);
      expect(p.y).toBeLessThanOrEqual(70 + 1e-6);
    }
    const xs = l.points.map((p) => p.x);
    const ys = l.points.map((p) => p.y);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(40, 3);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(40, 3);
  });

  it('preserves the aspect ratio (one degree of longitude is shorter than one of latitude)', () => {
    // Square in degrees, but at 60 N a degree of longitude is half a degree of latitude.
    const l = layoutRouteSnapshot([pt(60, 10), pt(61, 11)], SIZE, 10)!;
    const w = Math.abs(l.end.x - l.start.x);
    const h = Math.abs(l.end.y - l.start.y);
    expect(w / h).toBeCloseTo(Math.cos((60.5 * Math.PI) / 180), 2);
  });

  it('thins long paths but keeps both ends', () => {
    const path = Array.from({ length: 500 }, (_, i) => pt(43 + i * 0.0001, -79.4 + Math.sin(i / 20) * 0.001));
    const l = layoutRouteSnapshot(path, SIZE, 10, 40)!;
    expect(l.points).toHaveLength(40);
    expect(l.start).toEqual(l.points[0]);
    expect(l.end).toEqual(l.points[39]);
  });
});

describe('toSegments', () => {
  it('joins consecutive points and drops zero-length hops', () => {
    const segs = toSegments([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ cx: 5, cy: 0, length: 10, angle: 0 });
    expect(segs[1].angle).toBeCloseTo(Math.PI / 2, 6);
  });
});
