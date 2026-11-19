import { describe, expect, it } from 'vitest';

import { formatClock, formatDayHeading, formatDistance, formatDuration, formatSpeed, impactsPerKm } from './format';
import { boundsOf, thinPath } from './geo';

describe('format', () => {
  it('formats distance per unit', () => {
    expect(formatDistance(12_400, 'km')).toBe('12.4 km');
    expect(formatDistance(1609.344, 'mi')).toBe('1.0 mi');
    expect(formatDistance(250_000, 'km')).toBe('250 km');
  });
  it('formats speed', () => {
    expect(formatSpeed(10, 'km')).toBe('36');
    expect(formatSpeed(10, 'mi')).toBe('22');
    expect(formatSpeed(null, 'km')).toBe('–');
  });
  it('formats durations', () => {
    expect(formatDuration(45_000)).toBe('45 s');
    expect(formatDuration(12 * 60_000)).toBe('12 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min');
    expect(formatClock(3_909_000)).toBe('1:05:09');
    expect(formatClock(309_000)).toBe('05:09');
  });
  it('labels days', () => {
    const now = new Date(2026, 10, 11, 12).getTime();
    expect(formatDayHeading(new Date(2026, 10, 11, 8).getTime(), now)).toBe('Today');
    expect(formatDayHeading(new Date(2026, 10, 10, 23).getTime(), now)).toBe('Yesterday');
  });
  it('gates impacts per km under 500 m', () => {
    expect(impactsPerKm(3, 400)).toBeNull();
    expect(impactsPerKm(3, 1500)).toBeCloseTo(2);
  });
});

describe('geo', () => {
  it('thins a path keeping endpoints', () => {
    const p = Array.from({ length: 1000 }, (_, i) => i);
    const t = thinPath(p, 10);
    expect(t).toHaveLength(10);
    expect(t[0]).toBe(0);
    expect(t[9]).toBe(999);
    expect(thinPath([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });
  it('computes bounds', () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([{ lat: 1, lon: 2 }, { lat: 3, lon: -4 }])).toEqual([-4, 1, 2, 3]);
  });
});
