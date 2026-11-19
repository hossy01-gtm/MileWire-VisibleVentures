import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecentsStore } from '../recents/recentsStore';
import { useSettingsStore } from '../settings/settingsStore';
import type { DriveRecord } from '../tracking/types';
import { flushPendingUploads, joinFleet, leaveFleet, normalizeJoinCode, syncMembership } from './fleetService';

// vi.mock calls below are hoisted above these imports by vitest.
// The stores persist to AsyncStorage and the service talks to Supabase; both are
// replaced so the fleet logic runs in plain Node.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));

type Call = { table: string; op: string; filters: [string, unknown][]; payload?: unknown };
type Result = { data?: unknown; error?: { code?: string; message: string } | null };

const fake = vi.hoisted(() => ({
  calls: [] as Call[],
  userId: 'user-1' as string | null,
  rpc: (async () => ({ data: null, error: null })) as (name: string, args: unknown) => Promise<Result>,
  single: (() => ({ data: null, error: null })) as (table: string) => Result,
  upsert: (() => ({ error: null })) as (payload: unknown) => Result,
}));

vi.mock('./supabase', () => {
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] };
    // Chainable like the real query builder; awaiting it (a delete) resolves with no error.
    const b: Record<string, unknown> = {
      select: () => b,
      delete: () => ((call.op = 'delete'), b),
      eq: (col: string, val: unknown) => (call.filters.push([col, val]), b),
      maybeSingle: () => (fake.calls.push(call), Promise.resolve(fake.single(table))),
      upsert: (payload: unknown) => {
        call.op = 'upsert';
        call.payload = payload;
        fake.calls.push(call);
        return Promise.resolve(fake.upsert(payload));
      },
      then: (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) => {
        fake.calls.push(call);
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return b;
  }
  const client = {
    from,
    rpc: (name: string, args: unknown) => fake.rpc(name, args),
    auth: { getSession: async () => ({ data: { session: fake.userId ? { user: { id: fake.userId } } : null } }) },
  };
  return { getSupabase: () => client, ensureUserId: async () => fake.userId };
});

const FLEET_A = { fleetId: 'fleet-a', fleetName: 'Fleet A', displayName: 'Dana' };

function drive(id: string, fleetId: string | null, uploadedAt: number | null = null): DriveRecord {
  return {
    id,
    status: 'completed',
    startedAt: 1_000,
    endedAt: 2_000,
    distanceM: 100,
    durationMs: 1_000,
    movingMs: 900,
    maxSpeedMps: 10,
    avgSpeedMps: 5,
    joltCount: 0,
    jolts: [],
    path: [],
    gpsSamples: 3,
    gpsPoorSamples: 0,
    gpsGaps: 0,
    fleetId,
    uploadedAt,
  };
}

const deletes = (table: string) => fake.calls.filter((c) => c.table === table && c.op === 'delete');

beforeEach(() => {
  fake.calls.length = 0;
  fake.userId = 'user-1';
  fake.rpc = async () => ({ data: null, error: null });
  fake.single = () => ({ data: null, error: null });
  fake.upsert = () => ({ error: null });
  useSettingsStore.setState({ fleet: null, shareLive: true });
  useRecentsStore.setState({ drives: [] });
});

describe('normalizeJoinCode', () => {
  it('upper-cases and strips spaces and punctuation', () => {
    expect(normalizeJoinCode(' aq6-9 tk ')).toBe('AQ69TK');
  });
});

describe('joinFleet', () => {
  it('joins with the normalised code and remembers the fleet', async () => {
    const rpc = vi.fn(async () => ({ data: [{ fleet_id: 'fleet-b', fleet_name: 'North Region' }], error: null }));
    fake.rpc = rpc;
    const result = await joinFleet('aq6 9tk', '  Dana Reyes ');
    expect(rpc).toHaveBeenCalledWith('join_fleet', { p_code: 'AQ69TK', p_display_name: 'Dana Reyes' });
    expect(result.ok).toBe(true);
    expect(useSettingsStore.getState().fleet).toEqual({ fleetId: 'fleet-b', fleetName: 'North Region', displayName: 'Dana Reyes' });
  });

  it('reports an unknown code and changes nothing', async () => {
    fake.rpc = async () => ({ data: null, error: { message: 'fleet not found' } });
    const result = await joinFleet('ZZZZZZ', 'Dana Reyes');
    expect(result).toEqual({ ok: false, message: 'No fleet matches that code.' });
    expect(useSettingsStore.getState().fleet).toBeNull();
  });

  it('rejects a too-short code or name before touching the network', async () => {
    const rpc = vi.fn();
    fake.rpc = rpc;
    expect((await joinFleet('AB', 'Dana Reyes')).ok).toBe(false);
    expect((await joinFleet('AQ69TK', 'D')).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('leaves the previous fleet on the server when switching, after handing over its pending drives', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    useRecentsStore.setState({ drives: [drive('d1', 'fleet-a')] });
    fake.rpc = async () => ({ data: [{ fleet_id: 'fleet-b', fleet_name: 'Fleet B' }], error: null });

    const result = await joinFleet('BBBBBB', 'Dana');

    expect(result.ok).toBe(true);
    expect(useSettingsStore.getState().fleet?.fleetId).toBe('fleet-b');
    // The drive was uploaded while the driver was still a member of A...
    expect(fake.calls.some((c) => c.op === 'upsert' && c.table === 'drive_sessions')).toBe(true);
    expect(useRecentsStore.getState().drives[0].uploadedAt).not.toBeNull();
    // ...and only then was fleet A's membership removed.
    const upsertAt = fake.calls.findIndex((c) => c.op === 'upsert');
    const removeAt = fake.calls.findIndex((c) => c.table === 'fleet_members' && c.op === 'delete');
    expect(removeAt).toBeGreaterThan(upsertAt);
    expect(deletes('fleet_members')[0].filters).toEqual([
      ['fleet_id', 'fleet-a'],
      ['user_id', 'user-1'],
    ]);
    expect(deletes('live_positions')).toHaveLength(1);
  });

  it('does not remove anything when re-joining the same fleet', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    fake.rpc = async () => ({ data: [{ fleet_id: 'fleet-a', fleet_name: 'Fleet A' }], error: null });
    await joinFleet('AAAAAA', 'Dana R');
    expect(deletes('fleet_members')).toHaveLength(0);
    expect(useSettingsStore.getState().fleet?.displayName).toBe('Dana R');
  });
});

describe('leaveFleet', () => {
  it('clears the fleet, keeps uploaded history, and detaches drives not yet sent', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    useRecentsStore.setState({ drives: [drive('sent', 'fleet-a', 5), drive('pending', 'fleet-a')] });
    await leaveFleet();
    expect(useSettingsStore.getState().fleet).toBeNull();
    const byId = Object.fromEntries(useRecentsStore.getState().drives.map((d) => [d.id, d]));
    expect(byId.sent.fleetId).toBe('fleet-a');
    expect(byId.pending.fleetId).toBeNull();
    expect(deletes('fleet_members')).toHaveLength(1);
  });
});

describe('syncMembership', () => {
  it('does nothing when the phone is in no fleet', async () => {
    expect(await syncMembership()).toBe('ok');
    expect(fake.calls).toHaveLength(0);
  });

  it('clears the fleet when the manager has removed this driver', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    useRecentsStore.setState({ drives: [drive('sent', 'fleet-a', 5), drive('pending', 'fleet-a')] });
    fake.single = () => ({ data: null, error: null });

    expect(await syncMembership()).toBe('removed');

    expect(useSettingsStore.getState().fleet).toBeNull();
    const byId = Object.fromEntries(useRecentsStore.getState().drives.map((d) => [d.id, d]));
    expect(byId.pending.fleetId).toBeNull();
    expect(byId.sent.fleetId).toBe('fleet-a');
  });

  it('keeps the fleet when the check fails (offline must not eject a driver)', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    fake.single = () => ({ data: null, error: { message: 'Network request failed' } });
    expect(await syncMembership()).toBe('unknown');
    expect(useSettingsStore.getState().fleet).toEqual(FLEET_A);
  });

  it('keeps the fleet when there is no signed-in session to check with', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    fake.userId = null;
    expect(await syncMembership()).toBe('unknown');
    expect(useSettingsStore.getState().fleet).toEqual(FLEET_A);
  });

  it('picks up a renamed fleet', async () => {
    useSettingsStore.setState({ fleet: FLEET_A });
    fake.single = (table) => (table === 'fleet_members' ? { data: { display_name: 'Dana' }, error: null } : { data: { name: 'Fleet A (renamed)' }, error: null });
    expect(await syncMembership()).toBe('ok');
    expect(useSettingsStore.getState().fleet?.fleetName).toBe('Fleet A (renamed)');
  });
});

describe('flushPendingUploads', () => {
  const sentIds = () => fake.calls.filter((c) => c.op === 'upsert').map((c) => (c.payload as { id: string }).id);

  it('uploads every pending fleet drive and marks it uploaded', async () => {
    useRecentsStore.setState({ drives: [drive('a', 'fleet-a'), drive('b', 'fleet-a'), drive('solo', null)] });
    await flushPendingUploads();
    expect(sentIds().sort()).toEqual(['a', 'b']);
    expect(useRecentsStore.getState().drives.filter((d) => d.uploadedAt != null).map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('steps past a drive the server rejects instead of blocking the rest', async () => {
    useRecentsStore.setState({ drives: [drive('bad', 'fleet-a'), drive('good', 'fleet-a')].map((d, i) => ({ ...d, startedAt: 2_000 - i })) });
    fake.upsert = (payload) => ((payload as { id: string }).id === 'bad' ? { error: { code: '42501', message: 'row-level security' } } : { error: null });
    await flushPendingUploads();
    expect(sentIds()).toEqual(['bad', 'good']);
    const byId = Object.fromEntries(useRecentsStore.getState().drives.map((d) => [d.id, d]));
    expect(byId.good.uploadedAt).not.toBeNull();
    expect(byId.bad.uploadedAt).toBeNull();
  });

  it('stops at the first transient failure (offline)', async () => {
    useRecentsStore.setState({ drives: [drive('a', 'fleet-a'), drive('b', 'fleet-a')].map((d, i) => ({ ...d, startedAt: 2_000 - i })) });
    fake.upsert = () => ({ error: { message: 'Network request failed' } });
    await flushPendingUploads();
    expect(sentIds()).toHaveLength(1);
  });
});
