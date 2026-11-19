import { describe, expect, it } from "vitest";
import { CHASE_BACK_M, CHASE_UP_M, FPV_EYE_HEIGHT_M, chasePitchRad, computeFraming, easeToward, headingUnitEN, nextCameraCommand, nextCameraMode, orbitPitchRad, shortestTurnDeg, tiltedPitchRad, usesLookAt } from "./camera";

describe("camera framing", () => {
  it("cycles modes", () => {
    expect(nextCameraMode("orbit")).toBe("chase");
    expect(nextCameraMode("chase")).toBe("fpv");
    expect(nextCameraMode("fpv")).toBe("orbit");
  });
  it("headings map to east/north", () => {
    expect(headingUnitEN(0).north).toBeCloseTo(1);
    expect(headingUnitEN(90).east).toBeCloseTo(1);
  });
  it("chase sits behind the heading", () => {
    const f = computeFraming("chase", 90); // driving east → camera is west of the car
    expect(f.eye.east).toBeCloseTo(-CHASE_BACK_M);
    expect(f.eye.north).toBeCloseTo(0);
    expect(f.eye.up).toBe(CHASE_UP_M);
  });
  it("chase without a heading falls back to south-behind", () => {
    expect(computeFraming("chase", null).eye.north).toBeCloseTo(CHASE_BACK_M);
  });
  it("in-car is at cabin height and looks ahead", () => {
    const f = computeFraming("fpv", 0);
    expect(f.eye.up).toBe(FPV_EYE_HEIGHT_M);
    expect(f.target.north).toBeCloseTo(40);
  });
  it("orbit looks down", () => {
    expect(orbitPitchRad()).toBeLessThan(0);
  });
  it("shortest turn wraps across north", () => {
    expect(shortestTurnDeg(350, 10)).toBe(20);
    expect(shortestTurnDeg(10, 350)).toBe(-20);
    expect(shortestTurnDeg(0, 180)).toBe(-180); // half-turn is ambiguous
  });
  it("camera commands carry a fresh nonce even for a repeated press", () => {
    const first = nextCameraCommand(null, "tilt");
    const second = nextCameraCommand(first, "tilt");
    expect(first.nonce).toBe(1);
    expect(second.nonce).toBe(2);
    expect(second.kind).toBe("tilt");
  });
  it("tilt looks down more steeply than the default framing", () => {
    expect(tiltedPitchRad("orbit")).toBeLessThan(orbitPitchRad());
    expect(tiltedPitchRad("chase")).toBeLessThan(chasePitchRad());
  });
  it("only orbit and chase are look-at cameras", () => {
    expect(usesLookAt("orbit")).toBe(true);
    expect(usesLookAt("chase")).toBe(true);
    expect(usesLookAt("fpv")).toBe(false);
  });
  it("eases toward a target without overshooting", () => {
    const v = easeToward(0, 10, 0.1, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(10);
    expect(easeToward(0, 10, 0.1, 0)).toBe(10);
  });
});
