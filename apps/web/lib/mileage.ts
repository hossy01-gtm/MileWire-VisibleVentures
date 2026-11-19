import type { Assignment, DriveSummary, Vehicle } from "./types";

/**
 * A drive is attributed to a vehicle when an assignment window for that
 * vehicle and that same driver overlaps the drive's [start, end] (inclusive).
 * A drive counts once: when several windows overlap, the earliest assigned_at wins.
 */
function overlaps(a: Assignment, drive: DriveSummary): boolean {
  const start = drive.startedAt;
  const end = drive.endedAt ?? drive.startedAt;
  const winEnd = a.unassignedAt ?? Number.POSITIVE_INFINITY;
  return a.assignedAt <= end && winEnd >= start;
}

export function attributeDrive(assignments: readonly Assignment[], drive: DriveSummary): Assignment | null {
  let best: Assignment | null = null;
  for (const a of assignments) {
    if (a.userId !== drive.userId || !overlaps(a, drive)) continue;
    if (!best || a.assignedAt < best.assignedAt) best = a;
  }
  return best;
}

export type MileageReport = {
  vehicle: Vehicle;
  from: number;
  to: number;
  /** Odometer at the start of the range: baseline + attributed drives since the baseline. */
  openingOdometerKm: number;
  closingOdometerKm: number;
  rangeDistanceM: number;
  drives: Array<{ drive: DriveSummary; assignment: Assignment }>;
  byDriver: Array<{ userId: string; distanceM: number; drives: number }>;
};

export function buildMileageReport(input: {
  vehicle: Vehicle;
  assignments: readonly Assignment[];
  drives: readonly DriveSummary[];
  from: number;
  to: number;
}): MileageReport {
  const { vehicle, from, to } = input;
  const mine = input.assignments.filter((a) => a.vehicleId === vehicle.id);

  let beforeRangeM = 0;
  let rangeDistanceM = 0;
  const attributed: MileageReport["drives"] = [];
  const driverTotals = new Map<string, { distanceM: number; drives: number }>();

  for (const drive of input.drives) {
    // Only drives completed after the baseline was set move the odometer.
    if (drive.startedAt < vehicle.baselineEffectiveAt) continue;
    const assignment = attributeDrive(mine, drive);
    if (!assignment) continue;
    if (drive.startedAt < from) {
      beforeRangeM += drive.distanceM;
    } else if (drive.startedAt <= to) {
      rangeDistanceM += drive.distanceM;
      attributed.push({ drive, assignment });
      const t = driverTotals.get(drive.userId) ?? { distanceM: 0, drives: 0 };
      driverTotals.set(drive.userId, { distanceM: t.distanceM + drive.distanceM, drives: t.drives + 1 });
    }
  }

  attributed.sort((a, b) => a.drive.startedAt - b.drive.startedAt);
  const opening = vehicle.baselineOdometerKm + beforeRangeM / 1000;
  return {
    vehicle,
    from,
    to,
    openingOdometerKm: opening,
    closingOdometerKm: opening + rangeDistanceM / 1000,
    rangeDistanceM,
    drives: attributed,
    byDriver: [...driverTotals].map(([userId, t]) => ({ userId, ...t })).sort((a, b) => b.distanceM - a.distanceM),
  };
}

/** Drives that no vehicle window covers — shown as a "not counted" callout. */
export function unassignedDrives(assignments: readonly Assignment[], drives: readonly DriveSummary[]): DriveSummary[] {
  return drives.filter((d) => attributeDrive(assignments, d) === null);
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function mileageCsv(report: MileageReport, nameOf: (userId: string) => string, unitDivisor: number, unitLabel: string): string {
  const head = ["Date", "Driver", `Distance (${unitLabel})`, "Duration (min)"];
  const rows = report.drives.map(({ drive }) => [
    new Date(drive.startedAt).toLocaleString(),
    nameOf(drive.userId),
    (drive.distanceM / unitDivisor).toFixed(2),
    Math.round(drive.durationMs / 60_000),
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
