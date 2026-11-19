import type { MotionPoint } from "./types";

/** A bucket whose peak is at least this far from 1 g counts as a bump. */
export const BUMP_THRESHOLD_G = 0.3;

export type MotionSummary = {
  buckets: number;
  peakAccelG: number;
  peakGyroRadS: number;
  /** Buckets at or above the bump threshold. */
  bumpBuckets: number;
};

export function summarizeMotion(motion: readonly MotionPoint[]): MotionSummary {
  let peakAccelG = 0;
  let peakGyroRadS = 0;
  let bumpBuckets = 0;
  for (const [, accel, gyro] of motion) {
    if (accel > peakAccelG) peakAccelG = accel;
    if (gyro > peakGyroRadS) peakGyroRadS = gyro;
    if (accel >= BUMP_THRESHOLD_G) bumpBuckets += 1;
  }
  return { buckets: motion.length, peakAccelG, peakGyroRadS, bumpBuckets };
}

/** A drive has a usable motion series when it has at least two buckets. */
export const hasMotion = (motion: readonly MotionPoint[] | undefined): motion is MotionPoint[] => (motion?.length ?? 0) >= 2;
