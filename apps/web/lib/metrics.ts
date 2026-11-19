import { toDateInput } from "./format";
import type { DriveSummary } from "./types";

export type Totals = {
  drives: number;
  distanceM: number;
  durationMs: number;
  movingMs: number;
  joltCount: number;
  maxSpeedMps: number;
};

export function totalsOf(drives: readonly DriveSummary[]): Totals {
  const t: Totals = { drives: drives.length, distanceM: 0, durationMs: 0, movingMs: 0, joltCount: 0, maxSpeedMps: 0 };
  for (const d of drives) {
    t.distanceM += d.distanceM;
    t.durationMs += d.durationMs;
    t.movingMs += d.movingMs;
    t.joltCount += d.joltCount;
    t.maxSpeedMps = Math.max(t.maxSpeedMps, d.maxSpeedMps);
  }
  return t;
}

export function byDriver(drives: readonly DriveSummary[]): Array<{ userId: string } & Totals> {
  const groups = new Map<string, DriveSummary[]>();
  for (const d of drives) groups.set(d.userId, [...(groups.get(d.userId) ?? []), d]);
  return [...groups].map(([userId, ds]) => ({ userId, ...totalsOf(ds) })).sort((a, b) => b.distanceM - a.distanceM);
}

/** One bucket per local day from `from` to `to`, including empty days. */
export function byDay(drives: readonly DriveSummary[], from: number, to: number): Array<{ day: string; distanceM: number; drives: number }> {
  const buckets = new Map<string, { distanceM: number; drives: number }>();
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= to) {
    buckets.set(toDateInput(cursor.getTime()), { distanceM: 0, drives: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const d of drives) {
    const b = buckets.get(toDateInput(d.startedAt));
    if (b) {
      b.distanceM += d.distanceM;
      b.drives += 1;
    }
  }
  return [...buckets].map(([day, v]) => ({ day, ...v }));
}
