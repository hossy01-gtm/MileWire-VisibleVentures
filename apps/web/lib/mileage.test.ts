import { describe, expect, it } from "vitest";
import { attributeDrive, buildMileageReport, mileageCsv, unassignedDrives } from "./mileage";
import type { Assignment, DriveSummary, Vehicle } from "./types";

const H = 3_600_000;
const D = 24 * H;
const T0 = Date.UTC(2026, 9, 1);

const vehicle: Vehicle = { id: "v1", fleetId: "f", label: "Van 12", licensePlate: null, baselineOdometerKm: 1000, baselineEffectiveAt: T0 };
const win = (id: string, userId: string, from: number, to: number | null, vehicleId = "v1"): Assignment => ({
  id, fleetId: "f", vehicleId, userId, assignedAt: from, unassignedAt: to,
});
const drive = (id: string, userId: string, start: number, distanceM: number, durationMs = H): DriveSummary => ({
  id, userId, fleetId: "f", startedAt: start, endedAt: start + durationMs, distanceM, durationMs, movingMs: durationMs,
  maxSpeedMps: 20, avgSpeedMps: 10, joltCount: 0, gpsSamples: 10, gpsPoorSamples: 0, gpsGaps: 0,
});

describe("attributeDrive", () => {
  it("needs the same driver and an overlapping window (inclusive)", () => {
    const a = [win("a", "dana", T0, T0 + 2 * D)];
    expect(attributeDrive(a, drive("d", "dana", T0 + D, 1000))).toBe(a[0]);
    expect(attributeDrive(a, drive("d", "omar", T0 + D, 1000))).toBeNull();
    // drive that ends exactly when the window starts still overlaps (inclusive)
    expect(attributeDrive([win("a", "dana", T0 + 2 * H, null)], drive("d", "dana", T0, 1000, 2 * H))).not.toBeNull();
    expect(attributeDrive(a, drive("d", "dana", T0 + 3 * D, 1000))).toBeNull();
  });

  it("earliest window wins when a drive spans sequential windows", () => {
    const a = [win("late", "dana", T0 + 10 * H, null), win("early", "dana", T0, T0 + 10 * H)];
    expect(attributeDrive(a, drive("d", "dana", T0 + 9 * H, 500, 2 * H))?.id).toBe("early");
  });
});

describe("buildMileageReport", () => {
  const assignments = [win("a1", "dana", T0, T0 + 10 * D), win("a2", "omar", T0 + 10 * D, null), win("other", "dana", T0, null, "v2")];
  const drives = [
    drive("d1", "dana", T0 + D, 10_000),       // before range, counts toward opening odometer
    drive("d2", "dana", T0 + 5 * D, 20_000),   // in range
    drive("d3", "omar", T0 + 12 * D, 5_000),   // in range, other driver
    drive("d4", "omar", T0 + 3 * D, 99_000),   // omar not yet assigned → not this vehicle
    drive("d5", "dana", T0 - 3 * D, 77_000),   // before baseline → ignored
    drive("d6", "omar", T0 + 30 * D, 8_000),   // after range
  ];
  const report = buildMileageReport({ vehicle, assignments, drives, from: T0 + 4 * D, to: T0 + 20 * D });

  it("derives opening/closing odometer from baseline + attributed distance", () => {
    expect(report.openingOdometerKm).toBeCloseTo(1010, 5);
    expect(report.rangeDistanceM).toBe(25_000);
    expect(report.closingOdometerKm).toBeCloseTo(1035, 5);
  });
  it("lists range drives oldest-first with per-driver totals", () => {
    expect(report.drives.map((r) => r.drive.id)).toEqual(["d2", "d3"]);
    expect(report.byDriver).toEqual([{ userId: "dana", distanceM: 20_000, drives: 1 }, { userId: "omar", distanceM: 5_000, drives: 1 }]);
  });
  it("is honest about an empty range", () => {
    const empty = buildMileageReport({ vehicle, assignments, drives, from: T0 + 40 * D, to: T0 + 50 * D });
    expect(empty.rangeDistanceM).toBe(0);
    expect(empty.drives).toEqual([]);
  });
  it("exports CSV with quoting", () => {
    const csv = mileageCsv(report, (id) => (id === "dana" ? 'Dana "DJ" Reyes' : "Omar"), 1000, "km");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Driver,Distance (km),Duration (min)");
    expect(lines[1]).toContain('"Dana ""DJ"" Reyes",20.00,60');
  });
});

describe("unassignedDrives", () => {
  it("returns drives no window covers", () => {
    const a = [win("a", "dana", T0, T0 + D)];
    const out = unassignedDrives(a, [drive("x", "dana", T0 + 2 * D, 1), drive("y", "dana", T0, 1)]);
    expect(out.map((d) => d.id)).toEqual(["x"]);
  });
});
