export type DistanceUnit = "km" | "mi";

const KM_PER_MI = 1.609344;

export const metresToUnit = (m: number, unit: DistanceUnit) => (unit === "mi" ? m / 1609.344 : m / 1000);
export const kmToUnit = (km: number, unit: DistanceUnit) => (unit === "mi" ? km / KM_PER_MI : km);

export function formatDistance(m: number, unit: DistanceUnit = "km"): string {
  const v = metresToUnit(m, unit);
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${unit}`;
}

export function formatKm(km: number, unit: DistanceUnit = "km"): string {
  const v = kmToUnit(km, unit);
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ${unit}`;
}

export function formatSpeed(mps: number | null | undefined, unit: DistanceUnit = "km"): string {
  if (mps == null || !Number.isFinite(mps) || mps < 0) return "–";
  return `${Math.round(unit === "mi" ? mps * 2.236936 : mps * 3.6)} ${unit === "mi" ? "mph" : "km/h"}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min`;
  return `${total} s`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** Local (not UTC) date + time, e.g. "Nov 11, 5:42 PM". */
export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatAgo(epochMs: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - epochMs) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Bumps per km — only meaningful past 500 m of driving. Returns per-unit value. */
export function bumpsPerUnit(jolts: number, distanceM: number, unit: DistanceUnit = "km"): number | null {
  if (distanceM < 500) return null;
  return jolts / metresToUnit(distanceM, unit);
}

/** yyyy-mm-dd in the viewer's local zone, for <input type="date">. */
export function toDateInput(epochMs: number): string {
  const d = new Date(epochMs);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local midnight at the start of a yyyy-mm-dd string. */
export function startOfLocalDay(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Last millisecond of that local day. */
export function endOfLocalDay(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d + 1).getTime() - 1;
}
