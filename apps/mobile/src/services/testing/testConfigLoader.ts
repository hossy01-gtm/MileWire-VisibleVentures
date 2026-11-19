import type { DeveloperTestValues, TestConfig, TestingDeveloperConfigFile } from './types';

export const DEFAULT_DEV_TEST_VALUES: DeveloperTestValues = {
  simulationIntervalMs: 1000,
  simulationSpeedMps: 20,
  simulationAccelMps2: 3,
};

const DISABLED: TestConfig = {
  enabled: false,
  objective: 'default',
  showDevSettings: false,
  autoPlay: false,
  devTestValues: DEFAULT_DEV_TEST_VALUES,
};

function positiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function mergeValues(raw: unknown): DeveloperTestValues {
  const given = raw && typeof raw === 'object' ? (raw as Partial<Record<keyof DeveloperTestValues, unknown>>) : {};
  const out = { ...DEFAULT_DEV_TEST_VALUES };
  for (const key of Object.keys(out) as (keyof DeveloperTestValues)[]) {
    const candidate = given[key];
    if (positiveNumber(candidate)) out[key] = candidate;
  }
  return out;
}

function parseObjectives(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const names = raw.filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
  return names.length > 0 ? names : undefined;
}

/** `objective` wins; otherwise the first allow-listed objective; otherwise `'default'`. */
export function resolveObjective(objective: string | undefined, objectives: string[] | undefined): string {
  const trimmed = typeof objective === 'string' ? objective.trim() : '';
  if (trimmed) return trimmed;
  return objectives?.[0] ?? 'default';
}

/**
 * Pure parse of the config file. When `enabled` is not exactly `true`, every other
 * field is ignored: a disabled file can never change app behaviour.
 */
export function parseTestConfig(raw: unknown): TestConfig {
  if (!raw || typeof raw !== 'object') return DISABLED;
  const file = raw as TestingDeveloperConfigFile;
  if (file.enabled !== true) return DISABLED;
  const objectives = parseObjectives(file.objectives);
  return {
    enabled: true,
    objective: resolveObjective(file.objective, objectives),
    objectives,
    showDevSettings: file.showDevSettings === true,
    autoPlay: file.autoPlay !== false,
    devTestValues: mergeValues(file.devTestValues),
  };
}

let cached: TestConfig | null = null;

/**
 * Reads `config/testing.developer.json` at bundle time. The literal `require` is
 * required by Metro; `metro.config.js` swaps in the tracked template when the
 * local (gitignored) file is absent, so CI and EAS builds never break.
 */
export function loadTestConfig(): TestConfig {
  if (cached) return cached;
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    cached = DISABLED;
    return cached;
  }
  try {
    cached = parseTestConfig(require('../../../config/testing.developer.json'));
  } catch (error) {
    console.warn('[TestConfigLoader] Could not load testing config:', error);
    cached = DISABLED;
  }
  return cached;
}
