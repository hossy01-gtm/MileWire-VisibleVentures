/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseGpx } from './gpxParser';

describe('parseGpx', () => {
  it('reads waypoints in file order', () => {
    const xml = `<gpx><wpt lat="43.1" lon="-79.2"><name>a</name></wpt><wpt lat="43.2" lon='-79.3'/></gpx>`;
    expect(parseGpx(xml)).toEqual([
      { lat: 43.1, lon: -79.2 },
      { lat: 43.2, lon: -79.3 },
    ]);
  });

  it('falls back to track points, then route points', () => {
    expect(parseGpx(`<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt></trkseg></trk></gpx>`)).toEqual([{ lat: 1, lon: 2 }]);
    expect(parseGpx(`<gpx><rte><rtept lat="3" lon="4"/></rte></gpx>`)).toEqual([{ lat: 3, lon: 4 }]);
  });

  it('prefers waypoints when a file mixes kinds', () => {
    const xml = `<gpx><wpt lat="1" lon="1"/><trkpt lat="9" lon="9"/></gpx>`;
    expect(parseGpx(xml)).toEqual([{ lat: 1, lon: 1 }]);
  });

  it('skips malformed and out-of-range points instead of failing', () => {
    const xml = `<gpx><wpt lat="abc" lon="1"/><wpt lat="95" lon="1"/><wpt lat="1"/><wpt lat="2" lon="3"/></gpx>`;
    expect(parseGpx(xml)).toEqual([{ lat: 2, lon: 3 }]);
  });

  it('returns nothing for a document without points', () => {
    expect(parseGpx('<gpx></gpx>')).toEqual([]);
    expect(parseGpx('')).toEqual([]);
  });

  it('parses the bundled asset', () => {
    const file = resolve(__dirname, '../../../test-assets/developer/gpx-files/fisherville-to-fit4less.gpx');
    const points = parseGpx(readFileSync(file, 'utf8'));
    expect(points).toHaveLength(65);
    expect(points[0]).toEqual({ lat: 43.787256, lon: -79.460618 });
  });
});
