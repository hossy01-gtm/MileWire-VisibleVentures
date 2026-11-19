import type { Fix } from '../tracking/types';
import { parseGpx } from './gpxParser';
import { buildRoute } from './routePlayback';
import { SimulatedGps } from './simulatedGps';
import type { SimStatus, TestConfig, TestManifest, TestManifestEntry } from './types';

export type TestingDeps = {
  config: TestConfig;
  manifest: TestManifest;
  /** Resolve a manifest `gpx_file` key to the file's XML text. */
  loadGpxText: (gpxFile: string) => Promise<string>;
  gps?: SimulatedGps;
};

/**
 * Owns the simulation: which objective is selected, loading its GPX into the
 * simulated GPS, and the Play/Pause/Rewind controls a dev panel would call.
 * Nothing here needs a panel: with `enabled: true` in
 * `config/testing.developer.json` the first GPS listener loads the objective and
 * parks the phone at its origin. The drive starts when Track mode starts
 * (`beginDriveIfParked`), or straight away with `autoPlay: true`.
 */
export class TestingManager {
  readonly gps: SimulatedGps;
  private objective: string;
  private loaded: Promise<boolean> | null = null;
  private readonly deps: TestingDeps;

  constructor(deps: TestingDeps) {
    this.deps = deps;
    const { devTestValues } = deps.config;
    this.gps =
      deps.gps ??
      new SimulatedGps({
        intervalMs: devTestValues.simulationIntervalMs,
        speedMps: devTestValues.simulationSpeedMps,
        accelMps2: devTestValues.simulationAccelMps2,
      });
    this.objective = deps.config.objective;
  }

  isEnabled(): boolean {
    return this.deps.config.enabled;
  }

  getConfig(): TestConfig {
    return this.deps.config;
  }

  getObjective(): string {
    return this.entry()?.name ?? this.objective;
  }

  /** Objectives a picker should offer: the config allow-list when given, else every manifest entry. */
  getObjectives(): string[] {
    const known = new Set(this.deps.manifest.map((e) => e.name));
    const allowed = this.deps.config.objectives?.filter((n) => known.has(n));
    return allowed && allowed.length > 0 ? allowed : this.deps.manifest.map((e) => e.name);
  }

  private entry(name = this.objective): TestManifestEntry | undefined {
    // `default` (no objective configured anywhere) means "the first manifest entry".
    if (name === 'default') return this.deps.manifest[0];
    return this.deps.manifest.find((e) => e.name === name);
  }

  /**
   * Resolves true once the selected objective's route is loaded into the
   * simulated GPS. Resolves false (never throws) when simulation is off or the
   * objective cannot be loaded, so callers can fall back to the real GPS.
   */
  ready(): Promise<boolean> {
    if (!this.isEnabled()) return Promise.resolve(false);
    this.loaded ??= this.load(this.deps.config.autoPlay ? 'playing' : 'paused');
    return this.loaded;
  }

  /** Switch objective. Keeps playing if it was playing; otherwise stays paused at the start. */
  async selectObjective(name: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const previous = this.objective;
    const previousLoad = this.loaded;
    const wasPlaying = this.gps.getSnapshot().status === 'playing';
    this.objective = name;
    this.loaded = this.load(wasPlaying ? 'playing' : 'paused');
    const ok = await this.loaded;
    if (!ok) {
      // A failed load leaves the simulated GPS untouched, so keep what was there.
      this.objective = previous;
      this.loaded = previousLoad;
    }
    return ok;
  }

  /**
   * Track mode just started. A phone parked at the origin (or one that has
   * finished its drive) sets off; a drive the developer paused mid-route is left alone.
   */
  beginDriveIfParked(): void {
    if (!this.deps.config.playOnTrack) return;
    const { status, progress } = this.gps.getSnapshot();
    if ((status === 'paused' && progress === 0) || status === 'ended') this.gps.play();
  }

  async currentFix(): Promise<Fix | null> {
    return (await this.ready()) ? this.gps.currentFix() : null;
  }

  private async load(status: SimStatus): Promise<boolean> {
    const entry = this.entry();
    if (!entry) {
      console.warn(
        `[TestingManager] Objective "${this.objective}" is not in test-assets/developer/manifest.json. ` +
          `Using the real GPS. Available: ${this.deps.manifest.map((e) => e.name).join(', ')}`,
      );
      return false;
    }
    try {
      const route = buildRoute(parseGpx(await this.deps.loadGpxText(entry.gpx_file)));
      if (!route) {
        console.warn(`[TestingManager] "${entry.gpx_file}" has fewer than two distinct points. Using the real GPS.`);
        return false;
      }
      this.gps.load(route, status);
      console.log(
        `[TestingManager] Simulating "${entry.name}" (${entry.gpx_file}): ${route.points.length} points, ${Math.round(route.totalM)} m, ${status}`,
      );
      return true;
    } catch (error) {
      console.warn(`[TestingManager] Could not load "${entry.gpx_file}". Using the real GPS.`, error);
      return false;
    }
  }
}
