import { describe, expect, it } from "vitest";
import { chooseSurfaceHeight, heightsDiffer, interpolateAt, isPlausibleSurfaceHeight, sampleIndices } from "./surface";

describe("sampleIndices", () => {
  it("returns every index when there are few vertices", () => {
    expect(sampleIndices(4, 10)).toEqual([0, 1, 2, 3]);
  });
  it("spreads at most `max` indices evenly and keeps both ends", () => {
    const idx = sampleIndices(101, 5);
    expect(idx).toEqual([0, 25, 50, 75, 100]);
  });
  it("handles empty input and a single sample", () => {
    expect(sampleIndices(0, 5)).toEqual([]);
    expect(sampleIndices(50, 1)).toEqual([0]);
  });
  it("never repeats an index", () => {
    const idx = sampleIndices(268, 60);
    expect(new Set(idx).size).toBe(idx.length);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(267);
  });
});

describe("interpolateAt", () => {
  it("interpolates linearly between known indices", () => {
    expect(interpolateAt(5, [0, 4], [0, 8])).toEqual([0, 2, 4, 6, 8]);
  });
  it("holds the end values outside the known range", () => {
    expect(interpolateAt(6, [2, 3], [10, 20])).toEqual([10, 10, 10, 20, 20, 20]);
  });
  it("is all zeros when nothing is known", () => {
    expect(interpolateAt(3, [], [])).toEqual([0, 0, 0]);
  });
  it("passes through every known value", () => {
    const out = interpolateAt(10, [0, 3, 9], [5, -1, 4]);
    expect(out[0]).toBe(5);
    expect(out[3]).toBe(-1);
    expect(out[9]).toBe(4);
  });
});

describe("chooseSurfaceHeight", () => {
  it("uses the sample when it agrees with the terrain", () => {
    expect(chooseSurfaceHeight(48, 40)).toBe(48);
    expect(chooseSurfaceHeight(40, 100, 60)).toBe(40);
  });
  it("falls back to terrain when the sample is a coarse-tile hit far from it", () => {
    expect(chooseSurfaceHeight(7312, 40)).toBe(40);
    expect(chooseSurfaceHeight(200, 40)).toBe(40);
  });
  it("falls back to terrain when there is no sample yet", () => {
    expect(chooseSurfaceHeight(undefined, 41.5)).toBe(41.5);
  });
  it("uses a plausible sample as is when there is no terrain reference", () => {
    expect(chooseSurfaceHeight(48, undefined)).toBe(48);
    expect(chooseSurfaceHeight(8641, undefined)).toBeUndefined();
  });
  it("is undefined when neither is usable", () => {
    expect(chooseSurfaceHeight(undefined, undefined)).toBeUndefined();
    expect(chooseSurfaceHeight(NaN, NaN)).toBeUndefined();
  });
});

describe("isPlausibleSurfaceHeight", () => {
  it("accepts ordinary ground heights", () => {
    expect(isPlausibleSurfaceHeight(0)).toBe(true);
    expect(isPlausibleSurfaceHeight(48.3)).toBe(true);
    expect(isPlausibleSurfaceHeight(-20)).toBe(true);
  });
  it("rejects stray hits near the top of the sampling ray", () => {
    expect(isPlausibleSurfaceHeight(8641)).toBe(false);
    expect(isPlausibleSurfaceHeight(9000)).toBe(false);
  });
  it("rejects missing and non-finite values", () => {
    expect(isPlausibleSurfaceHeight(undefined)).toBe(false);
    expect(isPlausibleSurfaceHeight(NaN)).toBe(false);
    expect(isPlausibleSurfaceHeight(-5000)).toBe(false);
  });
});

describe("heightsDiffer", () => {
  it("is true without a previous series or when lengths differ", () => {
    expect(heightsDiffer(null, [1, 2])).toBe(true);
    expect(heightsDiffer([1], [1, 2])).toBe(true);
  });
  it("ignores changes within the tolerance", () => {
    expect(heightsDiffer([10, 20], [10.1, 20.2])).toBe(false);
  });
  it("detects a change beyond the tolerance", () => {
    expect(heightsDiffer([10, 20], [10, 21])).toBe(true);
  });
});
