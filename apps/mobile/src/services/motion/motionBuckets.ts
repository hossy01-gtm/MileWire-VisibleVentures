/**
 * One downsampled motion bucket: [epochMs, accelDevG, gyroRadS].
 * accelDevG is the peak |‖accel‖ − 1 g| in the bucket and gyroRadS the peak
 * rotation rate. Peaks (not averages) are kept so short bumps survive.
 */
export type MotionPoint = [t: number, accelDevG: number, gyroRadS: number];

/** Live aggregation window. */
export const MOTION_BUCKET_MS = 1000;
/** Buckets kept on a sealed drive. */
export const STORED_MOTION_MAX = 300;

const GRAVITY_G = 1;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Folds 10 Hz sensor samples into fixed windows, tracking each window's peaks. */
export class MotionBucketer {
  private start = -1;
  private accelDev = 0;
  private gyro = 0;

  /** Add one sample. Returns the previous bucket when this sample opens a new one. */
  add(t: number, accelMagnitudeG: number, gyroMagnitudeRadS: number): MotionPoint | null {
    const bucket = Math.floor(t / MOTION_BUCKET_MS) * MOTION_BUCKET_MS;
    let finished: MotionPoint | null = null;
    if (this.start >= 0 && bucket !== this.start) finished = this.flush();
    if (this.start < 0) this.start = bucket;
    this.accelDev = Math.max(this.accelDev, Math.abs(accelMagnitudeG - GRAVITY_G));
    this.gyro = Math.max(this.gyro, gyroMagnitudeRadS);
    return finished;
  }

  /** Emit the in-progress bucket (if any) and reset. */
  flush(): MotionPoint | null {
    if (this.start < 0) return null;
    const point: MotionPoint = [this.start, round3(this.accelDev), round3(this.gyro)];
    this.start = -1;
    this.accelDev = 0;
    this.gyro = 0;
    return point;
  }
}

/**
 * Merge adjacent buckets down to at most `max`, keeping each group's peaks and
 * its first timestamp, so the shape of the drive (and every big bump) survives.
 */
export function downsampleMotion(points: readonly MotionPoint[], max: number): MotionPoint[] {
  if (max < 1 || points.length <= max) return points.map((p) => [...p] as MotionPoint);
  const out: MotionPoint[] = [];
  const size = points.length / max;
  for (let g = 0; g < max; g++) {
    const from = Math.floor(g * size);
    const to = Math.max(from + 1, Math.floor((g + 1) * size));
    let accel = 0;
    let gyro = 0;
    for (let i = from; i < to && i < points.length; i++) {
      accel = Math.max(accel, points[i][1]);
      gyro = Math.max(gyro, points[i][2]);
    }
    out.push([points[from][0], accel, gyro]);
  }
  return out;
}
