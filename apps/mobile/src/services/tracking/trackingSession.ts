import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import { thinPath } from '@/lib/geo';

import {
  clearLivePosition,
  pushLivePosition,
  uploadDrive,
} from '../fleet/fleetService';
import {
  getLocationPermission,
  requestLocationPermission,
  watchFixes,
  type LocationWatch,
} from '../location/locationService';
import { STORED_MOTION_MAX, downsampleMotion } from '../motion/motionBuckets';
import { getMotionAvailability, startMotionTracking, type MotionTrackerHandle } from '../motion/motionTracker';
import type { MotionAvailability } from '../motion/types';
import { useRecentsStore } from '../recents/recentsStore';
import { useSettingsStore } from '../settings/settingsStore';
import { DriveRecorder, STORED_PATH_MAX } from './driveRecorder';
import type { DriveRecord, Fix } from './types';

export type TrackPhase = 'idle' | 'starting' | 'tracking' | 'stopping';
export type TrackError = 'location_denied' | 'location_blocked' | 'location_failed' | null;

type TrackState = {
  phase: TrackPhase;
  /** Live snapshot of the drive in progress (updates about once a second). */
  drive: DriveRecord | null;
  lastFix: Fix | null;
  motion: MotionAvailability | 'unknown';
  error: TrackError;
  start: () => Promise<boolean>;
  stop: () => Promise<DriveRecord | null>;
  /** Clear a failed-start error once the driver has seen it. */
  dismissError: () => void;
};

const TICK_MS = 1000;
const CHECKPOINT_MS = 15_000;

let recorder: DriveRecorder | null = null;
let watch: LocationWatch | null = null;
let motionHandle: MotionTrackerHandle | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let checkpointTimer: ReturnType<typeof setInterval> | null = null;

function teardown() {
  watch?.stop();
  motionHandle?.stop();
  if (tickTimer) clearInterval(tickTimer);
  if (checkpointTimer) clearInterval(checkpointTimer);
  watch = null;
  motionHandle = null;
  tickTimer = null;
  checkpointTimer = null;
}

export const useTrackStore = create<TrackState>((set, get) => ({
  phase: 'idle',
  drive: null,
  lastFix: null,
  motion: 'unknown',
  error: null,

  dismissError() {
    set({ error: null });
  },

  async start() {
    if (get().phase !== 'idle') return false;
    set({ phase: 'starting', error: null, drive: null, lastFix: null });

    let permission = await getLocationPermission();
    if (permission !== 'granted') permission = await requestLocationPermission();
    if (permission !== 'granted') {
      set({ phase: 'idle', error: permission === 'blocked' ? 'location_blocked' : 'location_denied' });
      return false;
    }

    const startedAt = Date.now();
    const fleetId = useSettingsStore.getState().fleet?.fleetId ?? null;
    const driveId = Crypto.randomUUID();
    const rec = new DriveRecorder(driveId, startedAt, fleetId);
    recorder = rec;

    try {
      watch = await watchFixes(
        (fix) => {
          const result = rec.addFix(fix);
          set({ lastFix: fix });
          if (result === 'accepted') void pushLivePosition(driveId, fix);
        },
        () => set({ error: 'location_failed' }),
      );
    } catch {
      teardown();
      recorder = null;
      set({ phase: 'idle', error: 'location_failed' });
      return false;
    }

    // Motion is best-effort: a drive is still valid with GPS alone.
    const motion = await getMotionAvailability();
    if (motion === 'available') {
      motionHandle = startMotionTracking({ onJolt: (jolt) => rec.addJolt(jolt), onBucket: (point) => rec.addMotion(point) });
    }

    useRecentsStore.getState().upsert(rec.snapshot(Date.now()));
    tickTimer = setInterval(() => set({ drive: rec.snapshot(Date.now()) }), TICK_MS);
    checkpointTimer = setInterval(() => {
      const snap = rec.snapshot(Date.now());
      useRecentsStore.getState().upsert({ ...snap, path: thinPath(snap.path, STORED_PATH_MAX), motion: downsampleMotion(snap.motion ?? [], STORED_MOTION_MAX) });
    }, CHECKPOINT_MS);

    set({ phase: 'tracking', drive: rec.snapshot(startedAt), motion });
    return true;
  },

  async stop() {
    const rec = recorder;
    if (get().phase !== 'tracking' || !rec) return null;
    set({ phase: 'stopping' });
    teardown();
    recorder = null;

    const finished = rec.finalize(Date.now());
    const recents = useRecentsStore.getState();
    // A drive that never got a usable GPS fix has nothing worth keeping.
    if (finished.gpsSamples === 0) {
      recents.remove(finished.id);
      set({ phase: 'idle', drive: null, lastFix: null });
      void clearLivePosition();
      return null;
    }

    recents.upsert(finished);
    set({ phase: 'idle', drive: null, lastFix: null });
    void clearLivePosition();
    if (finished.fleetId) void uploadDrive(finished);
    return finished;
  },
}));
