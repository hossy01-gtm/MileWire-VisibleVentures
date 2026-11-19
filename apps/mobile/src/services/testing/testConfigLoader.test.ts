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

  it('autoPlay defaults on and only an explicit false turns it off', () => {
    expect(parseTestConfig({ enabled: true }).autoPlay).toBe(true);
    expect(parseTestConfig({ enabled: true, autoPlay: false }).autoPlay).toBe(false);
  });
});

describe('resolveObjective', () => {
  it('prefers the objective, then the first allow-listed one, then default', () => {
    expect(resolveObjective('x', ['a'])).toBe('x');
    expect(resolveObjective('  ', ['a', 'b'])).toBe('a');
    expect(resolveObjective(undefined, undefined)).toBe('default');
  });
});
