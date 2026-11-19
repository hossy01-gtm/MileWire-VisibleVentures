import { describe, expect, it } from "vitest";
import { DEMO_RANGE, buildDemoAssignments, buildDemoDrives } from "./demoData";

const FIRST_MS = Date.UTC(2026, 10, 1); // 1 Nov 2026 00:00 UTC
const END_MS = Date.UTC(2026, 10, 17); // exclusive: 17 Nov 2026 00:00 UTC

describe("demo fleet history", () => {
  const drives = buildDemoDrives();

  it("has drives, and every one falls on 1–16 November 2026", () => {
    expect(drives.length).toBeGreaterThan(10);
    for (const d of drives) {
      expect(d.startedAt).toBeGreaterThanOrEqual(FIRST_MS);
      expect(d.endedAt!).toBeLessThan(END_MS);
    }
  });

  it("keeps path, jolt and motion timestamps inside the drive's own window", () => {
    for (const d of drives) {
      for (const p of d.path) expect(p[2]).toBeGreaterThanOrEqual(d.startedAt);
      expect(d.path[d.path.length - 1][2]).toBe(d.endedAt);
      for (const j of d.jolts) {
        expect(j.t).toBeGreaterThanOrEqual(d.startedAt);
        expect(j.t).toBeLessThanOrEqual(d.endedAt!);
      }
    }
  });

  it("covers both ends of the range, not just a slice of it", () => {
    const days = new Set(drives.map((d) => Math.floor((d.startedAt - FIRST_MS) / 86_400_000)));
    expect(Math.min(...days)).toBeLessThanOrEqual(1);
    expect(Math.max(...days)).toBeGreaterThanOrEqual(DEMO_RANGE.days - 2);
  });

  it("is deterministic, so it reads the same on any day", () => {
    expect(buildDemoDrives().map((d) => d.id)).toEqual(drives.map((d) => d.id));
    expect(buildDemoDrives()[0].startedAt).toBe(drives[0].startedAt);
  });

  it("hands Van 12 over inside the range", () => {
    const van12 = buildDemoAssignments().filter((a) => a.vehicleId === "veh-12");
    const handover = van12.find((a) => a.unassignedAt != null)!.unassignedAt!;
    expect(handover).toBeGreaterThan(FIRST_MS);
    expect(handover).toBeLessThan(END_MS);
  });
});
