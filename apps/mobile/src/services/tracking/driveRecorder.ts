import { haversineM, thinPath } from '@/lib/geo';

import { JOLT_EVENTS_CAP } from '../motion/config';
import { STORED_MOTION_MAX, downsampleMotion, type MotionPoint } from '../motion/motionBuckets';
import type { JoltDetectedEvent } from '../motion/types';
import type { DriveRecord, Fix, JoltMark, PathPoint } from './types';

/** Fixes worse than this are discarded outright. */
export const MAX_ACCURACY_M = 50;
/** Fixes above this accuracy are kept but counted as "poor". */
export const POOR_ACCURACY_M = 30;
/** A step implying more than this speed (m/s ≈ 252 km/h) is a GPS jump. */
export const MAX_PLAUSIBLE_SPEED_MPS = 70;
/** Below this step the phone is treated as stationary jitter. */
export const MIN_STEP_M = 3;
/** Speed (m/s) above which time counts as "moving". */
export const MOVING_SPEED_MPS = 1;
/** A silence longer than this between fixes is a GPS gap. */
export const GAP_THRESHOLD_MS = 5000;
/** Time spent in a gap longer than this is not credited as moving time. */
const MAX_CREDITED_DT_MS = 10_000;

const LIVE_PATH_CAP = 4000;
/** Live motion buckets (1 per second) are halved once they pass this, so a long drive stays bounded. */
const LIVE_MOTION_CAP = 4000;
export const STORED_PATH_MAX = 400;

export type FixResult = 'accepted' | 'stationary' | 'rejected';

/**
 * Pure drive accumulator: feed it GPS fixes and jolts, read a DriveRecord.
 * No React Native imports — fully unit-testable.
 */
export class DriveRecorder {
  private anchor: Fix | null = null;
  private lastPathAt = 0;
  private lastFixAt = 0;
  private lastPathFix: Fix | null = null;
  private record: DriveRecord;

  constructor(id: string, startedAt: number, fleetId: string | null) {
    this.record = {
      id,
      status: 'active',
      startedAt,
      endedAt: null,
      distanceM: 0,
      durationMs: 0,
      movingMs: 0,
      maxSpeedMps: 0,
      avgSpeedMps: 0,
      joltCount: 0,
      jolts: [],
      motion: [],
      path: [],
      gpsSamples: 0,
      gpsPoorSamples: 0,
      gpsGaps: 0,
      fleetId,
      uploadedAt: null,
    };
  }

  addFix(fix: Fix): FixResult {
    const r = this.record;
    if (fix.accuracy != null && fix.accuracy > MAX_ACCURACY_M) return 'rejected';
    if (this.lastFixAt && fix.timestamp <= this.lastFixAt) return 'rejected';

    if (!this.anchor) {
      this.countSample(fix);
      this.anchor = fix;
      this.lastFixAt = fix.timestamp;
      this.pushPath(fix, true);
      r.durationMs = Math.max(0, fix.timestamp - r.startedAt);
      return 'accepted';
    }

    const dtMs = fix.timestamp - this.lastFixAt;
    const step = haversineM(
      { lat: this.anchor.lat, lon: this.anchor.lon },
      { lat: fix.lat, lon: fix.lon },
    );
    if (step > 100 && step / (Math.max(dtMs, 1) / 1000) > MAX_PLAUSIBLE_SPEED_MPS) {
      // Teleport. Ignore the fix; keep the anchor so the next sane fix recovers.
      return 'rejected';
    }

    this.countSample(fix);
    if (dtMs > GAP_THRESHOLD_MS) r.gpsGaps += 1;
    this.lastFixAt = fix.timestamp;
    r.durationMs = Math.max(0, fix.timestamp - r.startedAt);

    const reported = fix.speed != null && fix.speed >= 0 ? fix.speed : null;
    const speed = reported ?? step / (Math.max(dtMs, 1) / 1000);

    if (step < MIN_STEP_M && speed < MOVING_SPEED_MPS) return 'stationary';

    r.distanceM += step;
    this.anchor = fix;
    if (speed >= MOVING_SPEED_MPS && dtMs <= MAX_CREDITED_DT_MS) {
      r.movingMs += dtMs;
    }
    if (speed <= MAX_PLAUSIBLE_SPEED_MPS) r.maxSpeedMps = Math.max(r.maxSpeedMps, speed);
    r.avgSpeedMps = r.movingMs > 0 ? r.distanceM / (r.movingMs / 1000) : 0;
    this.pushPath(fix, false, speed);
    return 'accepted';
  }

  addJolt(event: JoltDetectedEvent): void {
    const r = this.record;
    r.joltCount += 1;
    if (r.jolts.length >= JOLT_EVENTS_CAP) return;
    const mark: JoltMark = {
      t: event.timestamp,
      lat: this.anchor?.lat ?? null,
      lon: this.anchor?.lon ?? null,
      severity: event.severity,
      peakDev: event.features.peak_dev,
    };
    r.jolts.push(mark);
  }

  addMotion(point: MotionPoint): void {
    const r = this.record;
    const motion = r.motion ?? (r.motion = []);
    motion.push(point);
    if (motion.length > LIVE_MOTION_CAP) r.motion = downsampleMotion(motion, LIVE_MOTION_CAP / 2);
  }

  /** Live view of the drive (path not thinned). Safe to call every second. */
  snapshot(now: number): DriveRecord {
    const r = this.record;
    return { ...r, durationMs: Math.max(r.durationMs, now - r.startedAt) };
  }

  /** Seal the drive: stamp end time and thin the stored path. */
  finalize(endedAt: number): DriveRecord {
    const r = this.record;
    r.status = 'completed';
    r.endedAt = endedAt;
    r.durationMs = Math.max(0, endedAt - r.startedAt);
    r.path = thinPath(r.path, STORED_PATH_MAX);
    r.motion = downsampleMotion(r.motion ?? [], STORED_MOTION_MAX);
    return { ...r };
  }

  private countSample(fix: Fix): void {
    this.record.gpsSamples += 1;
    if (fix.accuracy != null && fix.accuracy > POOR_ACCURACY_M) this.record.gpsPoorSamples += 1;
  }

  private pushPath(fix: Fix, force: boolean, speed = fix.speed ?? 0): void {
    const r = this.record;
    const moved = this.lastPathFix
      ? haversineM(
          { lat: this.lastPathFix.lat, lon: this.lastPathFix.lon },
          { lat: fix.lat, lon: fix.lon },
        )
      : Infinity;
    if (!force && moved < 5 && fix.timestamp - this.lastPathAt < 3000) return;
    const point: PathPoint = [fix.lat, fix.lon, fix.timestamp, Math.max(0, speed)];
    r.path.push(point);
    this.lastPathFix = fix;
    this.lastPathAt = fix.timestamp;
    if (r.path.length > LIVE_PATH_CAP) r.path = thinPath(r.path, LIVE_PATH_CAP / 2);
  }
}
