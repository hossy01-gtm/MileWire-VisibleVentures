import { Asset } from 'expo-asset';

import type { Fix } from '../tracking/types';
import { createDevSimulationStore } from './devSimulationStore';
import { testingFiles } from './fileMap';
import { loadTestConfig } from './testConfigLoader';
import { TestingManager } from './testingManager';
import type { TestManifest } from './types';

async function loadGpxText(gpxFile: string): Promise<string> {
  const mod = testingFiles[gpxFile];
  if (mod == null) throw new Error(`"${gpxFile}" is not registered in src/services/testing/fileMap.ts`);
  if (typeof mod === 'string') return mod;
  const asset = Asset.fromModule(mod);
  try {
    await asset.downloadAsync();
  } catch {
    // Fall through: the Metro URL is readable directly in dev.
  }
  const res = await fetch(asset.localUri ?? asset.uri);
  if (!res.ok) throw new Error(`HTTP ${res.status} reading ${gpxFile}`);
  return res.text();
}

function loadManifest(): TestManifest {
  if (!loadTestConfig().enabled) return [];
  return require('../../../test-assets/developer/manifest.json') as TestManifest;
}

/**
 * The app-wide simulation. Constructed once; costs nothing when the config is
 * missing or `enabled` is not true (and in release builds, where `__DEV__` is false).
 */
export const testingManager = new TestingManager({ config: loadTestConfig(), manifest: loadManifest(), loadGpxText });

/** Zustand handle for a dev panel (or anything else) to drive and display the simulation. */
export const useDevSimulationStore = createDevSimulationStore(testingManager);

export function isSimulationEnabled(): boolean {
  return testingManager.isEnabled();
}

/** Simulated fix for the current playhead; null when simulation is off or could not load. */
export function getSimulatedFix(): Promise<Fix | null> {
  return testingManager.currentFix();
}

/**
 * Subscribe to simulated GPS. Resolves an unsubscribe function, or null when
 * simulation is off or failed to load, in which case the caller uses real GPS.
 * `startsDrive` marks the Track mode watcher: it sets a parked phone off.
 */
export async function watchSimulatedFixes(
  onFix: (fix: Fix) => void,
  opts: { startsDrive?: boolean } = {},
): Promise<(() => void) | null> {
  if (!(await testingManager.ready())) return null;
  const stop = testingManager.gps.subscribe(onFix);
  if (opts.startsDrive) testingManager.beginDriveIfParked();
  return stop;
}
