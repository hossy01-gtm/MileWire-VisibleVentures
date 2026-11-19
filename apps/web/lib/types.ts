/** One vertex of a recorded drive: [lat, lon, epochMs, speedMps]. */
export type PathPoint = [lat: number, lon: number, t: number, speedMps: number];

export type JoltSeverity = "low" | "medium" | "high";
export type JoltMark = {
  t: number;
  lat: number | null;
  lon: number | null;
  severity: JoltSeverity;
  /** Peak deviation from 1 g — how hard the bump was. */
  peakDev: number;
};

/**
 * One downsampled motion-sensor bucket: [epochMs, accelDevG, gyroRadS].
 * accelDevG is the peak |‖accel‖ − 1 g| in the bucket and gyroRadS the peak
 * rotation rate, so short bumps survive downsampling.
 */
export type MotionPoint = [t: number, accelDevG: number, gyroRadS: number];

export type Fleet = { id: string; name: string; joinCode: string; createdAt: number };

export type Member = { userId: string; displayName: string; joinedAt: number };

/** A driver's latest position while Track mode is on. */
export type LiveDriver = {
  userId: string;
  displayName: string;
  fleetId: string;
  sessionId: string | null;
  lat: number;
  lon: number;
  heading: number | null;
  speedMps: number | null;
  accuracyM: number | null;
  updatedAt: number;
};

export type DriveSummary = {
  id: string;
  userId: string;
  fleetId: string | null;
  startedAt: number;
  endedAt: number | null;
  distanceM: number;
  durationMs: number;
  movingMs: number;
  maxSpeedMps: number;
  avgSpeedMps: number;
  joltCount: number;
  gpsSamples: number;
  gpsPoorSamples: number;
  gpsGaps: number;
};

export type DriveDetail = DriveSummary & { path: PathPoint[]; jolts: JoltMark[]; motion: MotionPoint[] };

export type Vehicle = {
  id: string;
  fleetId: string;
  label: string;
  licensePlate: string | null;
  baselineOdometerKm: number;
  baselineEffectiveAt: number;
};

export type Assignment = {
  id: string;
  fleetId: string;
  vehicleId: string;
  userId: string;
  assignedAt: number;
  unassignedAt: number | null;
};

/** A driver is "live" if the last position is newer than this. */
export const LIVE_FRESH_MS = 2 * 60_000;
