import { describe, expect, it, vi } from 'vitest';

import type { Fix } from '../tracking/types';
import { buildRoute } from './routePlayback';
import { SimulatedGps } from './simulatedGps';

const ROUTE = buildRoute([
  { lat: 43.0, lon: -79.0 },
  { lat: 43.002, lon: -79.0 },
])!; // ~222 m

function make() {
  let clock = 1_000_000;
  const gps = new SimulatedGps({
    intervalMs: 1000,
    speedMps: 20,
    accelMps2: 3,
    now: () => clock,
    // Timers are driven by hand: `tick()` is one GPS epoch.
    setTimer: () => 'handle',
    clearTimer: () => undefined,
  });
  const advance = () => {
    clock += 1000;
    gps.tick();
  };
  return { gps, advance };
}

describe('SimulatedGps', () => {
  it('gives every subscriber the same fix, shaped like a real one', () => {
    const { gps, advance } = make();
    gps.load(ROUTE, 'playing');
    const a: Fix[] = [];
    const b: Fix[] = [];
    gps.subscribe((f) => a.push(f));
    gps.subscribe((f) => b.push(f));
    advance();
    advance();
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
    expect(a[1]).toMatchObject({ accuracy: 5, heading: expect.closeTo(0, 3) });
    expect(a[1].timestamp).toBeGreaterThan(a[0].timestamp);
    expect(a[1].speed).toBeGreaterThan(a[0].speed!);
  });

  it('does not run its timer without a listener, or while paused', () => {
    const setTimer = vi.fn(() => 'h');
    const clearTimer = vi.fn();
    const gps = new SimulatedGps({ intervalMs: 1000, speedMps: 20, accelMps2: 3, setTimer, clearTimer });
    gps.load(ROUTE, 'playing');
    expect(setTimer).not.toHaveBeenCalled();
    const off = gps.subscribe(() => undefined);
    expect(setTimer).toHaveBeenCalledTimes(1);
    gps.pause();
    expect(clearTimer).toHaveBeenCalled();
    gps.play();
    expect(setTimer).toHaveBeenCalledTimes(2);
    off();
    expect(clearTimer).toHaveBeenCalledTimes(2);
  });

  it('holds still while paused', () => {
    const { gps, advance } = make();
    gps.load(ROUTE, 'paused');
    const fixes: Fix[] = [];
    gps.subscribe((f) => fixes.push(f));
    advance();
    expect(fixes[0]).toMatchObject({ lat: 43.0, speed: 0 });
  });

  it('reaches the end, holds there at speed 0, and Play starts it over', () => {
    const { gps, advance } = make();
    gps.load(ROUTE, 'playing');
    const fixes: Fix[] = [];
    gps.subscribe((f) => fixes.push(f));
    for (let i = 0; i < 60 && gps.getSnapshot().status !== 'ended'; i++) advance();
    expect(gps.getSnapshot()).toMatchObject({ status: 'ended', progress: 1 });
    advance();
    const last = fixes[fixes.length - 1];
    expect(last.lat).toBeCloseTo(43.002, 6);
    expect(last.speed).toBe(0);
    gps.play();
    expect(gps.getSnapshot()).toMatchObject({ status: 'playing', progress: 0 });
  });

  it('rewinds to the start, paused', () => {
    const { gps, advance } = make();
    gps.load(ROUTE, 'playing');
    gps.subscribe(() => undefined);
    advance();
    advance();
    gps.rewind();
    expect(gps.getSnapshot()).toMatchObject({ status: 'paused', progress: 0 });
  });

  it('reports snapshots to listeners and has no fix before a route is loaded', () => {
    const { gps, advance } = make();
    expect(gps.currentFix()).toBeNull();
    gps.play(); // no route: ignored
    expect(gps.getSnapshot().status).toBe('idle');
    const seen: string[] = [];
    gps.onSnapshot((s) => seen.push(s.status));
    gps.load(ROUTE, 'playing');
    gps.subscribe(() => undefined);
    advance();
    expect(seen).toContain('playing');
  });

  it('observers see the position without keeping the clock running', () => {
    const setTimer = vi.fn(() => 'h');
    const gps = new SimulatedGps({ intervalMs: 1000, speedMps: 20, accelMps2: 3, setTimer, clearTimer: () => undefined });
    const seen: Fix[] = [];
    const off = gps.observe((f) => seen.push(f));
    gps.load(ROUTE, 'playing');
    expect(seen).toHaveLength(1); // the start position, as soon as the route loads
    expect(seen[0]).toMatchObject({ lat: 43.0, lon: -79.0 });
    expect(setTimer).not.toHaveBeenCalled(); // no GPS consumer: not moving
    gps.rewind();
    expect(seen).toHaveLength(2);
    off();
    gps.rewind();
    expect(seen).toHaveLength(2);
  });
});
