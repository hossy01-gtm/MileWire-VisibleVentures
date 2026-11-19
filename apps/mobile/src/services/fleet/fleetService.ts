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
  const membership: FleetMembership = { fleetId: row.fleet_id, fleetName: row.fleet_name, displayName: name };
  useSettingsStore.getState().setFleet(membership);
  return { ok: true, membership };
}

export async function leaveFleet(): Promise<void> {
  const fleet = useSettingsStore.getState().fleet;
  useSettingsStore.getState().setFleet(null);
  if (fleet) useRecentsStore.getState().unstampPending(fleet.fleetId);
  const sb = getSupabase();
  if (!sb || !fleet) return;
  const userId = await ensureUserId();
  if (!userId) return;
  await sb.from('fleet_members').delete().eq('fleet_id', fleet.fleetId).eq('user_id', userId);
  await sb.from('live_positions').delete().eq('user_id', userId);
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

/** Upload one completed drive that was stamped with a fleet. True on success. */
export async function uploadDrive(drive: DriveRecord): Promise<boolean> {
  if (drive.status !== 'completed' || !drive.fleetId) return false;
  const sb = getSupabase();
  if (!sb) return false;
  const userId = await ensureUserId();
  if (!userId) return false;
  const { error } = await sb.from('drive_sessions').upsert(toRow(drive, userId), { onConflict: 'id' });
  if (error) return false;
  useRecentsStore.getState().markUploaded(drive.id, Date.now());
  return true;
}

/** Retry every fleet-stamped drive that has not reached the backend yet. */
export async function flushPendingUploads(): Promise<void> {
  const pending = useRecentsStore
    .getState()
    .drives.filter((d) => d.status === 'completed' && d.fleetId && d.uploadedAt == null);
  for (const drive of pending) {
    if (!(await uploadDrive(drive))) break; // offline or rejected — try again next launch
  }
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
