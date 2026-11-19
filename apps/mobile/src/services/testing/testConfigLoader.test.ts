import { describe, expect, it } from 'vitest';

import { DEFAULT_DEV_TEST_VALUES, parseTestConfig, resolveObjective } from './testConfigLoader';

describe('parseTestConfig', () => {
  it('ignores every other field unless enabled is exactly true', () => {
    for (const raw of [undefined, null, 'x', {}, { enabled: false, objective: 'a' }, { enabled: 'true', objective: 'a' }]) {
      expect(parseTestConfig(raw)).toMatchObject({ enabled: false, objective: 'default', autoPlay: false });
    }
  });

  it('applies objective, allow-list, panel flag and tuning when enabled', () => {
    const cfg = parseTestConfig({
      enabled: true,
      objective: ' rltime-main-001 ',
      objectives: ['a', '', 7, 'b'],
      showDevSettings: true,
      devTestValues: { simulationSpeedMps: 30, simulationIntervalMs: -1, simulationAccelMps2: 'fast' },
    });
    expect(cfg).toMatchObject({ enabled: true, objective: 'rltime-main-001', objectives: ['a', 'b'], showDevSettings: true });
    expect(cfg.devTestValues).toEqual({ ...DEFAULT_DEV_TEST_VALUES, simulationSpeedMps: 30 });
  });

  it('does not start driving by itself unless autoPlay is exactly true', () => {
    expect(parseTestConfig({ enabled: true }).autoPlay).toBe(false);
    expect(parseTestConfig({ enabled: true, autoPlay: 'yes' }).autoPlay).toBe(false);
    expect(parseTestConfig({ enabled: true, autoPlay: true }).autoPlay).toBe(true);
  });

  it('starts the drive with Track mode unless playOnTrack is false', () => {
    expect(parseTestConfig({ enabled: true }).playOnTrack).toBe(true);
    expect(parseTestConfig({ enabled: true, playOnTrack: false }).playOnTrack).toBe(false);
  });
});

describe('resolveObjective', () => {
  it('prefers the objective, then the first allow-listed one, then default', () => {
    expect(resolveObjective('x', ['a'])).toBe('x');
    expect(resolveObjective('  ', ['a', 'b'])).toBe('a');
    expect(resolveObjective(undefined, undefined)).toBe('default');
  });
});
