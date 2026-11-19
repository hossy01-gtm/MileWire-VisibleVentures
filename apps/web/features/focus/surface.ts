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

/* ---------- Street-floor sampling (lowest plausible mesh reading around the pin) ---------- */

/**
 * `scene.sampleHeight` returns the first surface it hits: a rooftop or tree canopy when the GPS pin sits
 * on a footprint. A ring around the pin usually still sees pavement, so the lowest plausible reading wins.
 */
export const STREET_PROBE_RADIUS_M = 10;
const STREET_PROBE_BEARINGS_DEG = [0, 90, 180, 270] as const;
/** Coarse LOD from a continent-scale view is not street height; only trust samples with the camera this close. */
export const MAX_TRUSTED_SAMPLE_CAMERA_HEIGHT_M = 2500;

/** Centre plus a cardinal ring, as metres east / north of the pin. */
export function streetProbeOffsetsM(radiusM = STREET_PROBE_RADIUS_M): { eastM: number; northM: number }[] {
  const offsets = [{ eastM: 0, northM: 0 }];
  for (const bearing of STREET_PROBE_BEARINGS_DEG) {
    const rad = (bearing * Math.PI) / 180;
    offsets.push({ eastM: Math.sin(rad) * radiusM, northM: Math.cos(rad) * radiusM });
  }
  return offsets;
}

export function offsetLatLon(latDeg: number, lonDeg: number, eastM: number, northM: number): { lat: number; lon: number } {
  const cosLat = Math.cos((latDeg * Math.PI) / 180);
  return { lat: latDeg + northM / 111_320, lon: lonDeg + eastM / (111_320 * Math.max(0.15, cosLat)) };
}

/** Street height: the lowest plausible probe, so a lone rooftop or canopy at the pin cannot win. */
export function pickStreetFloor(heights: ReadonlyArray<number | null | undefined>): number | undefined {
  let floor: number | undefined;
  for (const h of heights) {
    if (!isPlausibleSurfaceHeight(h ?? undefined)) continue;
    floor = floor === undefined ? (h as number) : Math.min(floor, h as number);
  }
  return floor;
}

/** Mesh samples are meaningful only with the camera close in, and tiles settled (or the camera very near the ground). */
export function shouldTrustMeshSample(cameraHeightM: number | null | undefined, tilesLoaded: boolean): boolean {
  if (cameraHeightM == null || !Number.isFinite(cameraHeightM) || cameraHeightM > MAX_TRUSTED_SAMPLE_CAMERA_HEIGHT_M) return false;
  return tilesLoaded || cameraHeightM < 400;
}

/** Metres the eye must rise to clear the rendered surface; 0 when already clear (sub-2 m noise ignored). */
export function groundClearanceDeficit(cameraHeightM: number, groundM: number | null | undefined, clearanceM: number): number {
  if (!Number.isFinite(cameraHeightM) || groundM == null || !Number.isFinite(groundM)) return 0;
  const deficit = groundM + Math.max(0, clearanceM) - cameraHeightM;
  return deficit > 2 ? deficit : 0;
}

/** Index of the `trail` vertex ([lon, lat]) nearest a point, or -1 for an empty trail. */
export function nearestTrailIndex(trail: ReadonlyArray<readonly [number, number]>, lon: number, lat: number): number {
  let best = -1;
  let bestD = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < trail.length; i++) {
    const dx = (trail[i][0] - lon) * k;
    const dy = trail[i][1] - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
