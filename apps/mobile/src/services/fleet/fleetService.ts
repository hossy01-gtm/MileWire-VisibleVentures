import type { DriveRecord, Fix } from '../tracking/types';
import { useRecentsStore } from '../recents/recentsStore';
import { useSettingsStore, type FleetMembership } from '../settings/settingsStore';
import { ensureUserId, getSupabase } from './supabase';

export type JoinResult = { ok: true; membership: FleetMembership } | { ok: false; message: string };

/** Fleet join codes are 6–10 letters/digits; manager shares them verbally or by text. */
export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export async function joinFleet(rawCode: string, displayName: string): Promise<JoinResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'Fleet sharing is not set up in this build.' };
  const code = normalizeJoinCode(rawCode);
  const name = displayName.trim();
  if (code.length < 4) return { ok: false, message: 'Enter the join code from your fleet manager.' };
  if (name.length < 2) return { ok: false, message: 'Enter the name your fleet manager will see.' };

  const userId = await ensureUserId();
  if (!userId) return { ok: false, message: 'Could not reach MileWire. Check your connection and try again.' };

  const { data, error } = await sb.rpc('join_fleet', { p_code: code, p_display_name: name });
  if (error) {
    return {
      ok: false,
      message: /not found|invalid/i.test(error.message) ? 'No fleet matches that code.' : 'Could not join the fleet. Try again.',
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.fleet_id) return { ok: false, message: 'No fleet matches that code.' };

  // Joining a different fleet replaces the old membership: the old manager must
  // stop seeing this driver. Joined first, so a failed join never strands them.
  const previous = useSettingsStore.getState().fleet;
  if (previous && previous.fleetId !== row.fleet_id) {
    await flushPendingUploads(); // hand over drives driven under the old fleet while still a member
    useRecentsStore.getState().unstampPending(previous.fleetId);
    await removeMembership(previous.fleetId, userId);
  }

  const membership: FleetMembership = { fleetId: row.fleet_id, fleetName: row.fleet_name, displayName: name };
  useSettingsStore.getState().setFleet(membership);
  return { ok: true, membership };
}

/** Delete this driver's membership row and live position on the server. Best effort. */
async function removeMembership(fleetId: string, userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('fleet_members').delete().eq('fleet_id', fleetId).eq('user_id', userId);
  await sb.from('live_positions').delete().eq('user_id', userId);
}

export async function leaveFleet(): Promise<void> {
  const fleet = useSettingsStore.getState().fleet;
  useSettingsStore.getState().setFleet(null);
  if (fleet) useRecentsStore.getState().unstampPending(fleet.fleetId);
  if (!fleet) return;
  const userId = await ensureUserId();
  if (!userId) return;
  await removeMembership(fleet.fleetId, userId);
}

export type MembershipCheck = 'ok' | 'removed' | 'unknown';

/**
 * Confirm the fleet this phone believes it belongs to still has this driver on
 * its roster. A manager can remove a driver, or delete the fleet, at any time;
 * the phone only finds out by asking. Offline or any other failure is
 * 'unknown' and changes nothing, so a flaky connection never kicks a driver out.
 */
export async function syncMembership(): Promise<MembershipCheck> {
  const fleet = useSettingsStore.getState().fleet;
  if (!fleet) return 'ok';
  const sb = getSupabase();
  if (!sb) return 'unknown';
  const { data: session } = await sb.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return 'unknown';

  const { data, error } = await sb
    .from('fleet_members')
    .select('display_name')
    .eq('fleet_id', fleet.fleetId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 'unknown';

  if (!data) {
    // Only act if the driver is still in the fleet we checked (they may have switched mid-request).
    if (useSettingsStore.getState().fleet?.fleetId !== fleet.fleetId) return 'unknown';
    useSettingsStore.getState().setFleet(null);
    useRecentsStore.getState().unstampPending(fleet.fleetId);
    void clearLivePosition();
    return 'removed';
  }

  // Keep the shown fleet name current if the manager renamed it.
  const { data: f } = await sb.from('fleets').select('name').eq('id', fleet.fleetId).maybeSingle();
  if (f?.name && f.name !== fleet.fleetName) {
    const current = useSettingsStore.getState().fleet;
    if (current?.fleetId === fleet.fleetId) useSettingsStore.getState().setFleet({ ...current, fleetName: f.name });
  }
  return 'ok';
}

function toRow(drive: DriveRecord, userId: string) {
  return {
    id: drive.id,
    user_id: userId,
    fleet_id: drive.fleetId,
    started_at: new Date(drive.startedAt).toISOString(),
    ended_at: drive.endedAt ? new Date(drive.endedAt).toISOString() : null,
    distance_m: Math.round(drive.distanceM),
    duration_ms: drive.durationMs,
    moving_ms: drive.movingMs,
    max_speed_mps: drive.maxSpeedMps,
    avg_speed_mps: drive.avgSpeedMps,
    jolt_count: drive.joltCount,
    jolts: drive.jolts,
    path: drive.path,
    motion: drive.motion ?? [],
    gps_samples: drive.gpsSamples,
    gps_poor_samples: drive.gpsPoorSamples,
    gps_gaps: drive.gpsGaps,
  };
}

type UploadOutcome = 'uploaded' | 'retry' | 'rejected';

/**
 * Postgres access (42501) and data (22xxx, 23xxx) errors are the server saying
 * no to this particular drive; retrying cannot help. Anything else (offline,
 * expired token, timeouts) is worth another try.
 */
function isRejection(code: string | undefined): boolean {
  return !!code && (code === '42501' || /^2[23]\d{3}$/.test(code));
}

async function tryUpload(drive: DriveRecord): Promise<UploadOutcome> {
  if (drive.status !== 'completed' || !drive.fleetId) return 'rejected';
  const sb = getSupabase();
  if (!sb) return 'retry';
  const userId = await ensureUserId();
  if (!userId) return 'retry';
  const { error } = await sb.from('drive_sessions').upsert(toRow(drive, userId), { onConflict: 'id' });
  if (error) return isRejection(error.code) ? 'rejected' : 'retry';
  useRecentsStore.getState().markUploaded(drive.id, Date.now());
  return 'uploaded';
}

/** Upload one completed drive that was stamped with a fleet. True on success. */
export async function uploadDrive(drive: DriveRecord): Promise<boolean> {
  return (await tryUpload(drive)) === 'uploaded';
}

/**
 * Retry every fleet-stamped drive that has not reached the backend yet.
 * Stops at the first transient failure (offline: the rest would fail too), but
 * steps past a drive the server rejected so it cannot block the ones behind it.
 */
export async function flushPendingUploads(): Promise<void> {
  const pending = useRecentsStore
    .getState()
    .drives.filter((d) => d.status === 'completed' && d.fleetId && d.uploadedAt == null);
  for (const drive of pending) {
    if ((await tryUpload(drive)) === 'retry') break;
  }
}

let syncing: Promise<void> | null = null;

/**
 * Everything the phone owes the fleet service, in order: check the membership
 * is still valid, then send drives waiting to upload. Safe to call often; calls
 * made while one is running share it.
 */
export function syncFleet(): Promise<void> {
  if (!syncing) {
    syncing = (async () => {
      try {
        await syncMembership();
        await flushPendingUploads();
      } finally {
        syncing = null;
      }
    })();
  }
  return syncing;
}

const LIVE_MIN_INTERVAL_MS = 5000;
let lastLivePush = 0;

/** Publish the driver's current position for the fleet's live map (throttled). */
export async function pushLivePosition(sessionId: string, fix: Fix): Promise<void> {
  const { fleet, shareLive } = useSettingsStore.getState();
  if (!fleet || !shareLive) return;
  const now = Date.now();
  if (now - lastLivePush < LIVE_MIN_INTERVAL_MS) return;
  lastLivePush = now;
  const sb = getSupabase();
  const userId = await ensureUserId();
  if (!sb || !userId) return;
  await sb.from('live_positions').upsert({
    user_id: userId,
    fleet_id: fleet.fleetId,
    session_id: sessionId,
    lat: fix.lat,
    lon: fix.lon,
    heading: fix.heading,
    speed_mps: fix.speed,
    accuracy_m: fix.accuracy,
    updated_at: new Date(now).toISOString(),
  });
}

export async function clearLivePosition(): Promise<void> {
  lastLivePush = 0;
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await sb.from('live_positions').delete().eq('user_id', userId);
}
