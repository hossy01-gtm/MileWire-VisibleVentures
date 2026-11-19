import type { LatLon } from './types';

const POINT_TAG = /<(wpt|trkpt|rtept)\b([^>]*)>/g;
const ATTR = (name: string) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`);
const LAT = ATTR('lat');
const LON = ATTR('lon');

export function isValidPoint(p: LatLon): boolean {
  return (
    Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180
  );
}

/**
 * Points of a GPX document, in file order. Reads `<wpt>` (what the bundled
 * asset uses), and also `<trkpt>` / `<rtept>` so a recorded track works too.
 * When a file mixes kinds, waypoints win: they are the intended path.
 * Malformed points are skipped rather than failing the whole file.
 */
export function parseGpx(xml: string): LatLon[] {
  const byKind: Record<string, LatLon[]> = { wpt: [], trkpt: [], rtept: [] };
  for (const match of xml.matchAll(POINT_TAG)) {
    const lat = LAT.exec(match[2])?.[1];
    const lon = LON.exec(match[2])?.[1];
    if (lat == null || lon == null) continue;
    const point = { lat: parseFloat(lat), lon: parseFloat(lon) };
    if (isValidPoint(point)) byKind[match[1]].push(point);
  }
  return byKind.wpt.length > 0 ? byKind.wpt : byKind.trkpt.length > 0 ? byKind.trkpt : byKind.rtept;
}
