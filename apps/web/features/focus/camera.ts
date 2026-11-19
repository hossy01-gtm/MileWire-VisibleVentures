/**
 * Camera framing for the 3D focus view. Pure helpers — the Cesium viewer
 * turns these east/north/up offsets (metres, relative to the vehicle) into
 * real camera poses.
 */

export const CAMERA_MODES = ["orbit", "chase", "fpv"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];
export const DEFAULT_CAMERA_MODE: CameraMode = "orbit";

export const CAMERA_LABELS: Record<CameraMode, string> = { orbit: "Orbit", chase: "Chase", fpv: "In-car" };

/** One-shot toolbar actions: re-centre on the vehicle, toggle a steeper look-down, face north. */
export type CameraCommandKind = "recage" | "tilt" | "north";
/** `nonce` makes two presses of the same button distinct, so the viewer acts on each. */
export type CameraCommand = { kind: CameraCommandKind; nonce: number };

export function nextCameraCommand(previous: CameraCommand | null, kind: CameraCommandKind): CameraCommand {
  return { kind, nonce: (previous?.nonce ?? 0) + 1 };
}

/** Orbit and chase are look-at cameras; in-car looks along the heading and ignores tilt / north. */
export const usesLookAt = (mode: CameraMode): boolean => mode !== "fpv";

/** Cabin eye height for the in-car view (metres above ground). */
export const FPV_EYE_HEIGHT_M = 1.4;
/** Chase camera: distance behind and height above the vehicle. */
export const CHASE_BACK_M = 22;
export const CHASE_UP_M = 28;
/** Orbit camera: ground radius and height — city-scale so the surroundings read. */
export const ORBIT_RADIUS_M = 280;
export const ORBIT_HEIGHT_M = 160;

export type Enu = { east: number; north: number; up: number };
export type Framing = { eye: Enu; target: Enu; fovDeg: number };

/** Heading (0 = north, 90 = east) → unit vector in east/north. */
export function headingUnitEN(headingDeg: number): { east: number; north: number } {
  const rad = (headingDeg * Math.PI) / 180;
  return { east: Math.sin(rad), north: Math.cos(rad) };
}

export function nextCameraMode(current: CameraMode): CameraMode {
  return CAMERA_MODES[(CAMERA_MODES.indexOf(current) + 1) % CAMERA_MODES.length];
}

export function orbitRangeM(): number {
  return Math.hypot(ORBIT_RADIUS_M, ORBIT_HEIGHT_M);
}
/** Look-down pitch (radians, negative = down) for the orbit camera. */
export function orbitPitchRad(): number {
  return -Math.atan2(ORBIT_HEIGHT_M, ORBIT_RADIUS_M);
}
export function chaseRangeM(): number {
  return Math.hypot(CHASE_BACK_M, CHASE_UP_M);
}
export function chasePitchRad(): number {
  return -Math.atan2(CHASE_UP_M, CHASE_BACK_M);
}
/** Look-down pitch the Tilt toggle switches to: steeper than the mode's default. */
export function tiltedPitchRad(mode: "orbit" | "chase"): number {
  return mode === "orbit" ? -Math.PI / 3 : (-80 * Math.PI) / 180;
}

/** Orbit starts south of the vehicle, high up; the user then drags freely. */
export function computeOrbitFraming(): Framing {
  return { eye: { east: 0, north: -ORBIT_RADIUS_M, up: ORBIT_HEIGHT_M }, target: { east: 0, north: 0, up: 0 }, fovDeg: 60 };
}

/** Chase sits behind and above, locked to heading (south-behind when heading is unknown). */
export function computeChaseFraming(headingDeg: number | null): Framing {
  const u = headingUnitEN(headingDeg ?? 180);
  return {
    eye: { east: -u.east * CHASE_BACK_M, north: -u.north * CHASE_BACK_M, up: CHASE_UP_M },
    target: { east: 0, north: 0, up: 1 },
    fovDeg: 55,
  };
}

/** In-car looks forward along the heading from cabin height. */
export function computeFpvFraming(headingDeg: number | null): Framing {
  const u = headingUnitEN(headingDeg ?? 0);
  return {
    eye: { east: u.east * 0.4, north: u.north * 0.4, up: FPV_EYE_HEIGHT_M },
    target: { east: u.east * 40, north: u.north * 40, up: FPV_EYE_HEIGHT_M },
    fovDeg: 70,
  };
}

export function computeFraming(mode: CameraMode, headingDeg: number | null): Framing {
  switch (mode) {
    case "orbit":
      return computeOrbitFraming();
    case "chase":
      return computeChaseFraming(headingDeg);
    case "fpv":
      return computeFpvFraming(headingDeg);
  }
}

/** Shortest signed turn from `from` to `to` in degrees, in [-180, 180). A half-turn is ambiguous and returns -180. */
export function shortestTurnDeg(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Ease `from` toward `to`; `dtS` seconds elapsed, `tauS` the time constant. */
export function easeToward(from: number, to: number, dtS: number, tauS: number): number {
  if (tauS <= 0) return to;
  return from + (to - from) * (1 - Math.exp(-dtS / tauS));
}
