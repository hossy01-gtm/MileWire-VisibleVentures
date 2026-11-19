/**
 * Helpers for putting route lines on the 3D surface. Pure, so they can be tested without WebGL.
 *
 * Surface heights come from sampling the streamed 3D tiles. A vertex far from the camera has no
 * tile yet and samples as unknown; these helpers patch those gaps and avoid needless re-renders.
 */

/**
 * Surface-height sampling casts a ray down from 9 km, so anything it reports above this, or far
 * below sea level, is a stray hit (a line, a sky artefact) rather than ground.
 */
export function isPlausibleSurfaceHeight(h: number | undefined): h is number {
  return typeof h === "number" && Number.isFinite(h) && h > -500 && h < 8000;
}

/**
 * Pick the height to draw at. The streamed tile mesh is the truth once its street-level tiles have
 * loaded, but before that the sampler reads a coarse parent tile that can be kilometres off. World
 * terrain is always available and close to road level, so a sample is trusted only when it agrees
 * with the terrain within `windowM`; otherwise the terrain height is used. With no terrain
 * reference the sample is used as is (if plausible).
 */
export function chooseSurfaceHeight(sampled: number | undefined, terrain: number | undefined, windowM = 60): number | undefined {
  const sampleOk = isPlausibleSurfaceHeight(sampled);
  if (terrain === undefined || !Number.isFinite(terrain)) return sampleOk ? sampled : undefined;
  return sampleOk && Math.abs(sampled - terrain) <= windowM ? sampled : terrain;
}

/** Up to `max` evenly spaced vertex indices across `n` vertices, always including the first and last. */
export function sampleIndices(n: number, max: number): number[] {
  if (n <= 0 || max <= 0) return [];
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  if (max === 1) return [0];
  return Array.from({ length: max }, (_, k) => Math.round((k * (n - 1)) / (max - 1)));
}

/**
 * Linearly interpolate values known at some (ascending) indices to every index in [0, n).
 * Indices before the first / after the last known one take that end value. All zeros when nothing is known.
 */
export function interpolateAt(n: number, knownIdx: readonly number[], knownVal: readonly number[]): number[] {
  const out = new Array<number>(Math.max(0, n)).fill(0);
  const m = Math.min(knownIdx.length, knownVal.length);
  if (m === 0) return out;
  let k = 0;
  for (let i = 0; i < out.length; i++) {
    while (k < m - 1 && knownIdx[k + 1] <= i) k++;
    if (i <= knownIdx[0]) out[i] = knownVal[0];
    else if (k >= m - 1 || i >= knownIdx[m - 1]) out[i] = knownVal[m - 1];
    else {
      const span = knownIdx[k + 1] - knownIdx[k];
      const f = span > 0 ? (i - knownIdx[k]) / span : 0;
      out[i] = knownVal[k] + (knownVal[k + 1] - knownVal[k]) * f;
    }
  }
  return out;
}

/** True when two height series differ anywhere by more than `toleranceM` (or differ in length). */
export function heightsDiffer(a: ReadonlyArray<number> | null | undefined, b: ReadonlyArray<number>, toleranceM = 0.25): boolean {
  if (!a || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > toleranceM) return true;
  return false;
}
