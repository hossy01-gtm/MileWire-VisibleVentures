import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, BackHandler } from 'react-native';

import {
  getLocationPermission,
  openSystemSettings,
  requestLocationPermission,
  type LocationPermission,
} from '@/services/location/locationService';
import { useTrackStore } from '@/services/tracking/trackingSession';
import { useAutoLatch } from '@/services/tracking/useAutoLatch';

import { useJourneyStore } from './journeyStore';

function useAppActive(): boolean {
  const [active, setActive] = useState(() => AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * Everything the kits share: location permission, how Track mode starts (the
 * pill's hold or the auto-latch) and how it ends. Mounted once, above the kits,
 * so the idle GPS watch and the latch survive scene changes.
 */
export function useJourneyController() {
  const appActive = useAppActive();
  const phase = useTrackStore((s) => s.phase);
  const sheetOpen = useJourneyStore((s) => s.sheet != null);
  const [permission, setPermission] = useState<LocationPermission | null>(null);

  const refreshPermission = useCallback(async () => {
    setPermission(await getLocationPermission());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getLocationPermission().then((p) => {
      if (!cancelled) setPermission(p);
    });
    // Returning from the system Settings app changes no screen, so re-read on foreground.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshPermission();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [refreshPermission]);

  const granted = permission === 'granted';
  const sessionActive = phase !== 'idle';

  const startTracking = useCallback(async () => {
    const journey = useJourneyStore.getState();
    journey.closeSheet();
    journey.setFollowing(true);
    const started = await useTrackStore.getState().start();
    if (!started) void refreshPermission();
  }, [refreshPermission]);

  // No auto-start while a sheet is open: the driver is busy in the app.
  const { speedMps, confirming } = useAutoLatch({
    enabled: appActive && granted && !sheetOpen,
    sessionActive,
    onLatch: () => void startTracking(),
  });

  // Leaving by accident would orphan a live session, so back is only via Stop.
  useEffect(() => {
    if (!sessionActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [sessionActive]);

  const confirmStop = useCallback(() => {
    Alert.alert('Stop tracking?', 'Your drive will be saved to Recents.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          const finished = await useTrackStore.getState().stop();
          const journey = useJourneyStore.getState();
          journey.setFollowing(true);
          // Land on the finished drive: its route drawn on the map, numbers in the sheet.
          if (finished) journey.openSheet({ kind: 'drive', id: finished.id, from: 'finish' });
        },
      },
    ]);
  }, []);

  const enableLocation = useCallback(async () => {
    if (permission === 'blocked') {
      openSystemSettings();
      return;
    }
    setPermission(await requestLocationPermission());
  }, [permission]);

  return { permission, granted, speedMps, confirming, startTracking, confirmStop, enableLocation };
}

export type JourneyController = ReturnType<typeof useJourneyController>;
