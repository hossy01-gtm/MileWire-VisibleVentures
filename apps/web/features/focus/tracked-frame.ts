/**
 * Tracked-subject camera frame.
 *
 * Orbit and chase keep a lookAt transform on the vehicle and re-apply the camera's LOCAL offset every
 * frame, so the eye travels with the vehicle and the user's drag / zoom rotate around it. (A bare
 * `lookAtTransform(IDENTITY)` keeps the world position, which leaves the camera behind a moving pose
 * and lets drags pivot on the globe instead of the vehicle.) In-car is first-person and does not use it.
 */
import { CHASE_BACK_M, CHASE_UP_M, computeOrbitFraming, type CameraMode } from "./camera";

/** Closest readable follow range; inside this the camera crosses the vehicle. */
export const MIN_TRACKED_RANGE_M = 8;
/** Extra height the orbit / chase eye keeps above the surface under the camera. */
export const EYE_CLEARANCE_M = 12;

export type Offset = { x: number; y: number; z: number };

const magnitude = (o: Offset) => Math.hypot(o.x, o.y, o.z);

function scaleToRange(direction: Offset, rangeM: number): Offset {
  const mag = magnitude(direction);
  if (mag < 1e-9) return chaseOffset();
  const s = rangeM / mag;
  return { x: direction.x * s, y: direction.y * s, z: direction.z * s };
}

/** Chase offset in the vehicle body frame: +Y forward, +Z up, so behind-and-above is -Y / +Z. */
export const chaseOffset = (): Offset => ({ x: 0, y: -CHASE_BACK_M, z: CHASE_UP_M });

/** Orbit offset in the east-north-up frame: south of the vehicle, elevated. */
export function orbitOffset(): Offset {
  const { eye } = computeOrbitFraming();
  return { x: eye.east, y: eye.north, z: eye.up };
}

/** Keep a tracked camera on the same side of its target and outside the minimum range. */
export function clampTrackedOffset(offset: Offset, previous: Offset, minRangeM = MIN_TRACKED_RANGE_M): Offset {
  const dot = offset.x * previous.x + offset.y * previous.y + offset.z * previous.z;
  if (dot <= 0) return scaleToRange(previous, minRangeM);
  if (magnitude(offset) < minRangeM) return scaleToRange(offset, minRangeM);
  return offset;
}

/**
 * The local offset to hand to `camera.lookAtTransform(transform, offset)` this frame: the default framing the
 * first time, then whatever the user has dragged / zoomed to (clamped), so their view survives each re-anchor.
 */
export function offsetForFollow(opts: { framed: boolean; mode: Exclude<CameraMode, "fpv">; current: Offset | null; previous: Offset | null }): Offset {
  const fallback = opts.mode === "chase" ? chaseOffset() : orbitOffset();
  if (!opts.framed) return fallback;
  const current = opts.current ?? opts.previous;
  if (!current) return fallback;
  return opts.previous ? clampTrackedOffset(current, opts.previous) : current;
}

export function liftOffsetUp(offset: Offset, liftM: number): Offset {
  return Number.isFinite(liftM) && liftM > 0 ? { ...offset, z: offset.z + liftM } : offset;
}

/** Heading / pitch / range of an ENU-style offset, matching Cesium's lookAt HeadingPitchRange. Null when it is degenerate. */
export function offsetToHeadingPitchRange(o: Offset): { headingRad: number; pitchRad: number; rangeM: number } | null {
  const rangeM = magnitude(o);
  if (!Number.isFinite(rangeM) || rangeM < 1) return null;
  return { headingRad: Math.atan2(-o.x, -o.y), pitchRad: -Math.asin(Math.min(1, Math.max(-1, o.z / rangeM))), rangeM };
}

export function headingPitchRangeToOffset(headingRad: number, pitchRad: number, rangeM: number): Offset {
  const c = Math.cos(pitchRad);
  return { x: -Math.sin(headingRad) * c * rangeM, y: -Math.cos(headingRad) * c * rangeM, z: -Math.sin(pitchRad) * rangeM };
}
