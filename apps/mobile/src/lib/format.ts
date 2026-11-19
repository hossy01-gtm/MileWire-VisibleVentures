export type DistanceUnit = 'km' | 'mi';

const M_PER_MI = 1609.344;

export function metresTo(distanceM: number, unit: DistanceUnit): number {
  return unit === 'mi' ? distanceM / M_PER_MI : distanceM / 1000;
}

/** "12.4 km" / "0.3 mi". Always one decimal under 100, none above. */
export function formatDistance(distanceM: number, unit: DistanceUnit): string {
  const v = metresTo(distanceM, unit);
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${unit}`;
}

/** Speed from m/s into km/h or mph, rounded. */
export function formatSpeed(mps: number | null | undefined, unit: DistanceUnit): string {
  if (mps == null || !Number.isFinite(mps) || mps < 0) return '–';
  const v = unit === 'mi' ? mps * 2.236936 : mps * 3.6;
  return String(Math.round(v));
}

export const speedUnitLabel = (unit: DistanceUnit) => (unit === 'mi' ? 'mph' : 'km/h');

/** "1 h 05 min" / "12 min" / "45 s". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

/** Stopwatch style "01:05:09" / "05:09". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDayHeading(epochMs: number, now = Date.now()): string {
  const d = new Date(epochMs);
  const today = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatTimeOfDay(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Ride impacts per km — only meaningful past 500 m of driving. */
export function impactsPerKm(jolts: number, distanceM: number): number | null {
  if (distanceM < 500) return null;
  return jolts / (distanceM / 1000);
}
