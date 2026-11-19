import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DriveRecord } from '../tracking/types';

/** Recents keep the newest drives only; each stores a thinned path. */
export const RECENTS_CAP = 50;

type RecentsState = {
  drives: DriveRecord[];
  /** Insert or replace a drive by id (newest first). */
  upsert: (drive: DriveRecord) => void;
  remove: (id: string) => void;
  clear: () => void;
  markUploaded: (id: string, at: number) => void;
  /** Detach not-yet-uploaded drives from a fleet the driver has left. */
  unstampPending: (fleetId: string) => void;
  /** Seal any drive left "active" by a crash or force-quit. */
  sealInterrupted: () => void;
};

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      drives: [],
      upsert: (drive) =>
        set((s) => {
          const rest = s.drives.filter((d) => d.id !== drive.id);
          return { drives: [drive, ...rest].sort((a, b) => b.startedAt - a.startedAt).slice(0, RECENTS_CAP) };
        }),
      remove: (id) => set((s) => ({ drives: s.drives.filter((d) => d.id !== id) })),
      clear: () => set({ drives: [] }),
      markUploaded: (id, at) =>
        set((s) => ({ drives: s.drives.map((d) => (d.id === id ? { ...d, uploadedAt: at } : d)) })),
      unstampPending: (fleetId) =>
        set((s) => ({
          drives: s.drives.map((d) => (d.fleetId === fleetId && d.uploadedAt == null ? { ...d, fleetId: null } : d)),
        })),
      sealInterrupted: () =>
        set((s) => ({
          drives: s.drives.map((d) => {
            if (d.status !== 'active') return d;
            const endedAt = d.path.length > 0 ? d.path[d.path.length - 1][2] : d.startedAt;
            return { ...d, status: 'completed', endedAt, durationMs: Math.max(0, endedAt - d.startedAt) };
          }),
        })),
    }),
    { name: 'milewire.recents.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
