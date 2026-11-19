import { describe, expect, it } from "vitest";
import { byDay, byDriver, totalsOf } from "./metrics";
import { haversineM, poseAt, bearingDeg } from "./geo";
import { endOfLocalDay, formatDuration, startOfLocalDay, toDateInput, bumpsPerUnit } from "./format";
import { BUMP_THRESHOLD_G, hasMotion, summarizeMotion } from "./motion";
import type { DriveSummary, MotionPoint, PathPoint } from "./types";

const base = { fleetId: "f", endedAt: 0, movingMs: 0, avgSpeedMps: 0, gpsSamples: 0, gpsPoorSamples: 0, gpsGaps: 0 };
const mk = (id: string, userId: string, startedAt: number, distanceM: number, joltCount = 0, maxSpeedMps = 10): DriveSummary =>
  ({ ...base, id, userId, startedAt, distanceM, durationMs: 60_000, joltCount, maxSpeedMps });

describe("metrics", () => {
  const day1 = new Date(2026, 10, 9, 10).getTime();
  const day2 = new Date(2026, 10, 11, 10).getTime();
  const drives = [mk("a", "u1", day1, 1000, 2, 12), mk("b", "u2", day2, 3000, 1, 20), mk("c", "u1", day2, 500, 0, 5)];

  it("totals", () => {
    expect(totalsOf(drives)).toMatchObject({ drives: 3, distanceM: 4500, joltCount: 3, maxSpeedMps: 20 });
  });
  it("groups by driver, largest first", () => {
    expect(byDriver(drives).map((d) => [d.userId, d.distanceM])).toEqual([["u2", 3000], ["u1", 1500]]);
  });
  it("buckets by local day including empty days", () => {
    const out = byDay(drives, new Date(2026, 10, 9).getTime(), new Date(2026, 10, 11, 23).getTime());
    expect(out.map((b) => b.day)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
    expect(out.map((b) => b.distanceM)).toEqual([1000, 0, 3500]);
  });
});

describe("format + geo", () => {
  it("local day bounds round-trip", () => {
    const s = startOfLocalDay("2026-11-11");
    expect(toDateInput(s)).toBe("2026-11-11");
    expect(toDateInput(endOfLocalDay("2026-11-11"))).toBe("2026-11-11");
    expect(endOfLocalDay("2026-11-11") - s).toBeGreaterThan(22 * 3_600_000);
  });
  it("formats", () => {
    expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
    expect(bumpsPerUnit(3, 400)).toBeNull();
    expect(bumpsPerUnit(4, 2000)).toBe(2);
  });
  it("geo basics", () => {
    expect(haversineM(43.65, -79.38, 43.65, -79.38)).toBe(0);
    expect(haversineM(0, 0, 0, 1)).toBeCloseTo(111_195, -2);
    expect(bearingDeg(0, 0, 1, 0)).toBeCloseTo(0, 5);
    expect(bearingDeg(0, 0, 0, 1)).toBeCloseTo(90, 5);
  });
  it("interpolates pose along a path and clamps outside it", () => {
    const path: PathPoint[] = [[0, 0, 0, 0], [0, 0.001, 10_000, 10], [0.001, 0.001, 20_000, 10]];
    expect(poseAt([], 0)).toBeNull();
    expect(poseAt(path, -5)?.index).toBe(0);
    const mid = poseAt(path, 5000)!;
    expect(mid.lon).toBeCloseTo(0.0005, 6);
    expect(mid.headingDeg).toBeCloseTo(90, 3);
    expect(mid.speedMps).toBeCloseTo(5, 5);
    expect(poseAt(path, 99_999)).toMatchObject({ lat: 0.001, lon: 0.001, index: 2 });
  });
});

describe("motion summary", () => {
  const motion: MotionPoint[] = [[0, 0.05, 0.1], [2000, 0.31, 0.2], [4000, 0.9, 3.4], [6000, 0.29, 0.05]];
  it("finds peaks and counts bump-level buckets", () => {
    expect(summarizeMotion(motion)).toEqual({ buckets: 4, peakAccelG: 0.9, peakGyroRadS: 3.4, bumpBuckets: 2 });
    expect(BUMP_THRESHOLD_G).toBe(0.3);
  });
  it("treats empty and one-bucket series as no motion data", () => {
    expect(summarizeMotion([])).toEqual({ buckets: 0, peakAccelG: 0, peakGyroRadS: 0, bumpBuckets: 0 });
    expect(hasMotion([])).toBe(false);
    expect(hasMotion([[0, 0.1, 0.1]])).toBe(false);
    expect(hasMotion(motion)).toBe(true);
    expect(hasMotion(undefined)).toBe(false);
  });
});
