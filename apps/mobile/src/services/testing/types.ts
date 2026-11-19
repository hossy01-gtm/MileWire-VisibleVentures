/**
 * Raw shape of `config/testing.developer.json` (every field optional at parse time).
 */
export type TestingDeveloperConfigFile = {
  enabled?: boolean;
  /** Manifest objective to play. Empty falls back to the first of `objectives`. */
  objective?: string;
  /** Allow-list shown by a dev panel's objective picker. */
  objectives?: string[];
  /** Whether a dev panel should be mounted. Simulation never depends on it. */
  showDevSettings?: boolean;
  /** Start playing as soon as something listens for GPS. Default true. */
  autoPlay?: boolean;
  devTestValues?: Partial<DeveloperTestValues>;
};

export type DeveloperTestValues = {
  /** Time between simulated GPS fixes. */
  simulationIntervalMs: number;
  /** Cruising speed along the route, m/s (20 ≈ 72 km/h). */
  simulationSpeedMps: number;
  /** Acceleration and braking, m/s². Gives the drive a real start and stop. */
  simulationAccelMps2: number;
};

export type TestConfig = {
  enabled: boolean;
  objective: string;
  objectives?: string[];
  showDevSettings: boolean;
  autoPlay: boolean;
  devTestValues: DeveloperTestValues;
};

/** One entry of `test-assets/developer/manifest.json`. */
export type TestManifestEntry = {
  name: string;
  description: string;
  /** "lat, lon" start point. */
  location: string;
  /** Key into `fileMap.ts`, relative to `test-assets/developer/`. */
  gpx_file: string;
};

export type TestManifest = TestManifestEntry[];

export type LatLon = { lat: number; lon: number };

export type SimStatus = 'idle' | 'playing' | 'paused' | 'ended';
