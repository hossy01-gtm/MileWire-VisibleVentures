import { describe, expect, it } from "vitest";
import { CHASE_BACK_M, CHASE_UP_M } from "./camera";
import {
  MIN_TRACKED_RANGE_M,
  chaseOffset,
  clampTrackedOffset,
  headingPitchRangeToOffset,
  liftOffsetUp,
  offsetForFollow,
  offsetToHeadingPitchRange,
  orbitOffset,
} from "./tracked-frame";

describe("tracked frame offsets", () => {
  it("frames chase behind-and-above in the body frame and orbit south-and-above in ENU", () => {
    expect(chaseOffset()).toEqual({ x: 0, y: -CHASE_BACK_M, z: CHASE_UP_M });
    const o = orbitOffset();
    expect(o.x).toBe(0);
    expect(o.y).toBeLessThan(0);
    expect(o.z).toBeGreaterThan(0);
  });

  it("uses the default framing first, then keeps the user's view", () => {
    expect(offsetForFollow({ framed: false, mode: "orbit", current: { x: 1, y: 1, z: 1 }, previous: null })).toEqual(orbitOffset());
    const user = { x: 50, y: -80, z: 40 };
    expect(offsetForFollow({ framed: true, mode: "orbit", current: user, previous: user })).toEqual(user);
  });

  it("will not let the camera cross the vehicle or flip to its far side", () => {
    const prev = { x: 0, y: -20, z: 10 };
    const tooClose = clampTrackedOffset({ x: 0, y: -1, z: 1 }, prev);
    expect(Math.hypot(tooClose.x, tooClose.y, tooClose.z)).toBeCloseTo(MIN_TRACKED_RANGE_M);
    const flipped = clampTrackedOffset({ x: 0, y: 20, z: -10 }, prev);
    expect(flipped.y).toBeLessThan(0);
  });

  it("round-trips heading, pitch and range", () => {
    const o = headingPitchRangeToOffset(0.7, -0.5, 120);
    const r = offsetToHeadingPitchRange(o)!;
    expect(r.headingRad).toBeCloseTo(0.7);
    expect(r.pitchRad).toBeCloseTo(-0.5);
    expect(r.rangeM).toBeCloseTo(120);
    expect(offsetToHeadingPitchRange({ x: 0, y: 0, z: 0 })).toBeNull();
  });

  it("lifts only upward", () => {
    expect(liftOffsetUp({ x: 1, y: 2, z: 3 }, 4)).toEqual({ x: 1, y: 2, z: 7 });
    expect(liftOffsetUp({ x: 1, y: 2, z: 3 }, -4)).toEqual({ x: 1, y: 2, z: 3 });
  });
});
