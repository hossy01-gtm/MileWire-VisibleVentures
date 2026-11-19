import type { MotionPoint } from '../motion/motionBuckets';
import type { JoltSeverity } from '../motion/types';

/** One usable GPS fix, already normalised from the platform location object. */
export type Fix = {
  lat: number;
  lon: number;
  /** Horizontal accuracy in metres, when the platform reports it. */
  accuracy: number | null;
  /** Ground speed in m/s. Null when the platform has no valid reading. */
  speed: number | null;
  /** Course in degrees clockwise from north. Null when unknown. */
  heading: number | null;
  /** Epoch milliseconds. */
  timestamp: number;
};

/** A thinned path vertex: [lat, lon, epochMs, speedMps]. */
export type PathPoint = [number, number, number, number];

export type JoltMark = {
  t: number;
  lat: number | null;
  lon: number | null;
  severity: JoltSeverity;
  /** Peak deviation from 1 g — how hard the hit was. */
  peakDev: number;
};

export type DriveStatus = 'active' | 'completed';

/** A recorded drive. GPS + motion only. */
export type DriveRecord = {
  id: string;
  status: DriveStatus;
  startedAt: number;
  endedAt: number | null;
  distanceM: number;
  durationMs: number;
  movingMs: number;
  maxSpeedMps: number;
  avgSpeedMps: number;
  joltCount: number;
  jolts: JoltMark[];
  /** Downsampled motion-sensor series; absent on drives saved before it was recorded. */
  motion?: MotionPoint[];
  path: PathPoint[];
  gpsSamples: number;
  gpsPoorSamples: number;
  gpsGaps: number;
  /** Fleet this drive is shared with (stamped at start), if any. */
  fleetId: string | null;
  /** Epoch ms the drive reached the fleet backend; null until then. */
  uploadedAt: number | null;
};
