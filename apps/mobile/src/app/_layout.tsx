import { DarkTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { Journey } from '@/journey/Journey';
import { MapUnderlay } from '@/journey/MapUnderlay';
import { flushPendingUploads } from '@/services/fleet/fleetService';
import { useRecentsStore } from '@/services/recents/recentsStore';
import { useSettingsStore } from '@/services/settings/settingsStore';

void SplashScreen.preventAutoHideAsync();

/** The app is dark-only: React Navigation never switches to a light theme. */
const MileWireTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.brand,
  },
};

function whenHydrated(persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void }) {
  return new Promise<void>((resolve) => {
    if (persist.hasHydrated()) resolve();
    else persist.onFinishHydration(() => resolve());
  });
}

export default function RootLayout() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([whenHydrated(useRecentsStore.persist), whenHydrated(useSettingsStore.persist)]);
      if (cancelled) return;
      // A drive still "active" at cold start was cut short by a crash or force-quit.
      useRecentsStore.getState().sealInterrupted();
      await SplashScreen.hideAsync();
      void flushPendingUploads();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemeProvider value={MileWireTheme}>
      <StatusBar style="light" />
      {/* One map under everything; the journey floats above it. */}
      <View style={styles.root}>
        <MapUnderlay />
        <Journey />
        <Slot />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
});
