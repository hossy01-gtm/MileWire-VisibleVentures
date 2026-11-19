import { describe, expect, it, vi } from 'vitest';

import { SimulatedGps } from './simulatedGps';
import { parseTestConfig } from './testConfigLoader';
import { TestingManager } from './testingManager';
import type { TestManifest } from './types';

const manifest: TestManifest = [
  { name: 'one', description: '', location: '0, 0', gpx_file: 'one.gpx' },
  { name: 'two', description: '', location: '0, 0', gpx_file: 'two.gpx' },
  { name: 'bad', description: '', location: '0, 0', gpx_file: 'bad.gpx' },
  { name: 'broken', description: '', location: '0, 0', gpx_file: 'broken.gpx' },
];
const GPX: Record<string, string> = {
  'one.gpx': '<gpx><wpt lat="43.0" lon="-79.0"/><wpt lat="43.01" lon="-79.0"/></gpx>',
  'two.gpx': '<gpx><wpt lat="44.0" lon="-80.0"/><wpt lat="44.01" lon="-80.0"/></gpx>',
  'bad.gpx': '<gpx><wpt lat="1" lon="1"/></gpx>',
};
const loadGpxText = vi.fn(async (key: string) => {
  if (!(key in GPX)) throw new Error('nope');
  return GPX[key];
});

function make(raw: unknown) {
  const config = parseTestConfig(raw);
  // Timers are inert: these tests drive nothing, they only inspect state.
  const gps = new SimulatedGps({ intervalMs: 1000, speedMps: 20, accelMps2: 3, setTimer: () => 'h', clearTimer: () => undefined });
  return new TestingManager({ config, manifest, loadGpxText, gps });
}

describe('TestingManager', () => {
  it('is inert when the config is disabled', async () => {
    const m = make({ enabled: false, objective: 'one' });
    expect(m.isEnabled()).toBe(false);
    expect(await m.ready()).toBe(false);
    expect(await m.currentFix()).toBeNull();
    expect(await m.selectObjective('two')).toBe(false);
  });

  it('loads the configured objective and starts playing with autoPlay', async () => {
    const m = make({ enabled: true, objective: 'one', autoPlay: true });
    expect(await m.ready()).toBe(true);
    expect(m.gps.getSnapshot().status).toBe('playing');
    expect((await m.currentFix())!.lat).toBeCloseTo(43.0);
  });

  it('loads parked at the origin by default', async () => {
    const m = make({ enabled: true, objective: 'one' });
    await m.ready();
    expect(m.gps.getSnapshot()).toMatchObject({ status: 'paused', progress: 0 });
    expect((await m.currentFix())!.speed).toBe(0);
  });

  it('Track mode sets a parked phone off, but not one paused mid-drive', async () => {
    const m = make({ enabled: true, objective: 'one' });
    await m.ready();
    m.beginDriveIfParked();
    expect(m.gps.getSnapshot().status).toBe('playing');

    m.gps.tick();
    m.gps.pause();
    m.beginDriveIfParked(); // paused with progress > 0: the developer's choice stands
    expect(m.gps.getSnapshot().status).toBe('paused');
  });

  it('Track mode restarts a finished drive', async () => {
    const m = make({ enabled: true, objective: 'one', autoPlay: true });
    await m.ready();
    for (let i = 0; i < 200 && m.gps.getSnapshot().status !== 'ended'; i++) m.gps.tick();
    expect(m.gps.getSnapshot().status).toBe('ended');
    m.beginDriveIfParked();
    expect(m.gps.getSnapshot()).toMatchObject({ status: 'playing', progress: 0 });
  });

  it('playOnTrack:false leaves the phone parked', async () => {
    const m = make({ enabled: true, objective: 'one', playOnTrack: false });
    await m.ready();
    m.beginDriveIfParked();
    expect(m.gps.getSnapshot().status).toBe('paused');
  });

  it('treats "default" as the first manifest entry', async () => {
    const m = make({ enabled: true });
    expect(m.getObjective()).toBe('one');
    expect(await m.ready()).toBe(true);
  });

  it('falls back (false, no throw) for an unknown objective, a one-point file and an unreadable file', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await make({ enabled: true, objective: 'missing' }).ready()).toBe(false);
    expect(await make({ enabled: true, objective: 'bad' }).ready()).toBe(false);
    expect(await make({ enabled: true, objective: 'broken' }).ready()).toBe(false);
    warn.mockRestore();
  });

  it('switches objective, keeping playback, and a failed switch keeps the old drive', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const m = make({ enabled: true, objective: 'one', autoPlay: true });
    await m.ready();
    expect(await m.selectObjective('two')).toBe(true);
    expect(m.getObjective()).toBe('two');
    expect(m.gps.getSnapshot().status).toBe('playing');
    expect((await m.currentFix())!.lat).toBeCloseTo(44.0);

    expect(await m.selectObjective('nope')).toBe(false);
    expect(m.getObjective()).toBe('two');
    expect((await m.currentFix())!.lat).toBeCloseTo(44.0);
    warn.mockRestore();
  });

  it('offers the allow-list limited to real manifest entries, else everything', () => {
    expect(make({ enabled: true, objectives: ['two', 'ghost'] }).getObjectives()).toEqual(['two']);
    expect(make({ enabled: true, objectives: ['ghost'] }).getObjectives()).toEqual(['one', 'two', 'bad', 'broken']);
  });
});
