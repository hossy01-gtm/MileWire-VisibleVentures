import { describe, expect, it } from "vitest";
import { REPLAY_SPEEDS, nextReplaySpeed } from "./useReplayClock";

describe("nextReplaySpeed", () => {
  it("steps through the speeds in order", () => {
    expect(nextReplaySpeed(1)).toBe(2);
    expect(nextReplaySpeed(4)).toBe(8);
  });
  it("wraps from the fastest back to the slowest", () => {
    expect(nextReplaySpeed(REPLAY_SPEEDS[REPLAY_SPEEDS.length - 1])).toBe(REPLAY_SPEEDS[0]);
  });
});
