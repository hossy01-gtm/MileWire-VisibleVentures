import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DistanceUnit } from '@/lib/format';

export type FleetMembership = {
  fleetId: string;
  fleetName: string;
  /** Name the fleet manager sees for this driver. */
  displayName: string;
};

type SettingsState = {
  distanceUnit: DistanceUnit;
  fleet: FleetMembership | null;
  /** Share live position with the fleet while tracking. */
  shareLive: boolean;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setFleet: (fleet: FleetMembership | null) => void;
  setShareLive: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      distanceUnit: 'km',
      fleet: null,
      shareLive: true,
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setFleet: (fleet) => set({ fleet }),
      setShareLive: (shareLive) => set({ shareLive }),
    }),
    { name: 'milewire.settings.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
