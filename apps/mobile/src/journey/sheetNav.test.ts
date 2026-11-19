import { describe, expect, it } from 'vitest';

import { resolveMapPadding } from './mapPadding';
import { resolveSnapTarget, sheetGeometry } from './sheetGeometry';
import { parentSheet, peekFraction, railToolFor, resolveScene, toggleRail, type Sheet } from './sheetNav';

const drive = (from: 'recents' | 'finish'): Sheet => ({ kind: 'drive', id: 'd1', from });

describe('scene', () => {
  it('a running session always owns the screen', () => {
    for (const phase of ['starting', 'tracking', 'stopping'] as const) {
      expect(resolveScene(phase, { kind: 'settings' })).toBe('live');
      expect(resolveScene(phase, null)).toBe('live');
    }
  });
  it('idle: a drive sheet is the review scene, anything else is browse', () => {
    expect(resolveScene('idle', drive('recents'))).toBe('review');
    expect(resolveScene('idle', { kind: 'recents' })).toBe('browse');
    expect(resolveScene('idle', null)).toBe('browse');
  });
});

describe('sheet navigation', () => {
  it('Back goes to the parent sheet, or closes when there is none', () => {
    expect(parentSheet({ kind: 'fleet' })).toEqual({ kind: 'settings' });
    expect(parentSheet(drive('recents'))).toEqual({ kind: 'recents' });
    expect(parentSheet(drive('finish'))).toBeNull();
    expect(parentSheet({ kind: 'recents' })).toBeNull();
    expect(parentSheet({ kind: 'settings' })).toBeNull();
  });

  it('lights the rail button that owns the open sheet', () => {
    expect(railToolFor(null)).toBeNull();
    expect(railToolFor({ kind: 'recents' })).toBe('recents');
    expect(railToolFor(drive('recents'))).toBe('recents');
    expect(railToolFor({ kind: 'settings' })).toBe('settings');
    expect(railToolFor({ kind: 'fleet' })).toBe('settings');
  });

  it('a rail press closes the lit tool and switches to any other', () => {
    expect(toggleRail(null, 'recents')).toEqual({ kind: 'recents' });
    expect(toggleRail({ kind: 'recents' }, 'recents')).toBeNull();
    expect(toggleRail(drive('recents'), 'recents')).toBeNull();
    expect(toggleRail({ kind: 'recents' }, 'settings')).toEqual({ kind: 'settings' });
    expect(toggleRail({ kind: 'fleet' }, 'settings')).toBeNull();
  });

  it('the drive sheet peeks lower so the route has room on the map', () => {
    expect(peekFraction(drive('finish'))).toBeLessThan(peekFraction({ kind: 'recents' }));
  });
});

describe('sheet geometry', () => {
  const geo = sheetGeometry({ viewportH: 800, safeTop: 52, peekFraction: 0.65 });

  it('keeps full > peek and the closed offset equal to the full height', () => {
    expect(geo.fullH).toBeCloseTo((800 - 60) * 0.92, 5);
    expect(geo.peekH).toBeCloseTo((800 - 60) * 0.65, 5);
    expect(geo.peekY).toBeCloseTo(geo.fullH - geo.peekH, 5);
    expect(geo.closedY).toBe(geo.fullH);
  });

  it('a slow drag settles on the nearest detent', () => {
    expect(resolveSnapTarget({ y: 5, vy: 0, peekY: geo.peekY, closedY: geo.closedY })).toBe('full');
    expect(resolveSnapTarget({ y: geo.peekY + 10, vy: 0, peekY: geo.peekY, closedY: geo.closedY })).toBe('peek');
    expect(resolveSnapTarget({ y: geo.closedY - 10, vy: 0, peekY: geo.peekY, closedY: geo.closedY })).toBe('closed');
  });

  it('a flick moves one detent in its direction', () => {
    const at = (y: number, vy: number) => resolveSnapTarget({ y, vy, peekY: geo.peekY, closedY: geo.closedY });
    expect(at(geo.peekY, 2)).toBe('closed');
    expect(at(geo.peekY, -2)).toBe('full');
    expect(at(0, 2)).toBe('peek'); // full -> peek, not straight to closed
    expect(at(geo.closedY, -2)).toBe('peek');
  });
});

describe('map padding', () => {
  const base = { safeTop: 50, safeBottom: 30 };

  it('latches at the sheet peek height and ignores the scene chrome', () => {
    const p = resolveMapPadding({ ...base, scene: 'browse', sheetPeekH: 480 });
    expect(p.paddingBottom).toBe(480);
  });

  it('review fits the route above the sheet', () => {
    const p = resolveMapPadding({ ...base, scene: 'review', sheetPeekH: 360 });
    expect(p.paddingBottom).toBeGreaterThan(360);
    expect(p.paddingTop).toBeGreaterThan(base.safeTop);
  });

  it('the in-drive layer reserves more room than browse (top card + dock)', () => {
    const live = resolveMapPadding({ ...base, scene: 'live', sheetPeekH: null });
    const browse = resolveMapPadding({ ...base, scene: 'browse', sheetPeekH: null });
    expect(live.paddingBottom).toBeGreaterThan(browse.paddingBottom);
    expect(live.paddingTop).toBeGreaterThan(browse.paddingTop);
  });
});
