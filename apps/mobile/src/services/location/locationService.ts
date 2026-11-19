import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { getSimulatedFix, watchSimulatedFixes } from '../testing/runtime';
import type { Fix } from '../tracking/types';

export type LocationPermission = 'granted' | 'denied' | 'blocked' | 'undetermined';

function toPermission(p: Location.LocationPermissionResponse): LocationPermission {
  if (p.granted) return 'granted';
  if (p.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
  return p.canAskAgain ? 'denied' : 'blocked';
}

export async function getLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.getForegroundPermissionsAsync());
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  return toPermission(await Location.requestForegroundPermissionsAsync());
}

export function openSystemSettings(): void {
  void Linking.openSettings();
}

function toFix(loc: Location.LocationObject): Fix {
  const { latitude, longitude, accuracy, speed, heading } = loc.coords;
  return {
    lat: latitude,
    lon: longitude,
    accuracy: accuracy != null && accuracy >= 0 ? accuracy : null,
    speed: speed != null && speed >= 0 ? speed : null,
    heading: heading != null && heading >= 0 ? heading : null,
    timestamp: loc.timestamp,
  };
}

/** One quick fix, for centring the landing map. Null when unavailable. */
export async function getCurrentFix(): Promise<Fix | null> {
  // Dev simulation (config/testing.developer.json): the route's current position.
  const simulated = await getSimulatedFix();
  if (simulated) return simulated;
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return toFix(last);
    return toFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  } catch {
    return null;
  }
}

export type LocationWatch = { stop: () => void };

/**
 * Lightweight GPS while the map is idle: only what the speed readout and the
 * auto-latch need (a fix about once a second). Never records anything; Track
 * mode swaps this for `watchFixes`.
 */
export async function watchIdleFixes(
  onFix: (fix: Fix) => void,
  onError?: (message: string) => void,
): Promise<LocationWatch> {
  const stopSimulated = await watchSimulatedFixes(onFix);
  if (stopSimulated) return { stop: stopSimulated };
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 1,
      timeInterval: 1000,
    },
    (loc) => onFix(toFix(loc)),
    (reason) => onError?.(reason),
  );
  return { stop: () => sub.remove() };
}

/**
 * Continuous high-accuracy GPS for Track mode: best-for-navigation accuracy,
 * a fix at least every 2 s or every 5 m.
 */
export async function watchFixes(
  onFix: (fix: Fix) => void,
  onError?: (message: string) => void,
): Promise<LocationWatch> {
  const stopSimulated = await watchSimulatedFixes(onFix, { startsDrive: true });
  if (stopSimulated) return { stop: stopSimulated };
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      timeInterval: 2000,
    },
    (loc) => onFix(toFix(loc)),
    (reason) => onError?.(reason),
  );
  return { stop: () => sub.remove() };
}
