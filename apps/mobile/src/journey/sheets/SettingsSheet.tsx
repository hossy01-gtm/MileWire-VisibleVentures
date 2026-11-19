import Constants from 'expo-constants';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import {
  getLocationPermission,
  openSystemSettings,
  requestLocationPermission,
  type LocationPermission,
} from '@/services/location/locationService';
import { getMotionAvailability, requestMotionPermission } from '@/services/motion/motionTracker';
import type { MotionAvailability } from '@/services/motion/types';
import { useRecentsStore } from '@/services/recents/recentsStore';
import { useSettingsStore } from '@/services/settings/settingsStore';

import { useJourneyStore } from '../journeyStore';
import { SheetScroll } from './ToolSheet';

const LOCATION_LABEL: Record<LocationPermission, string> = {
  granted: 'On',
  denied: 'Off',
  blocked: 'Off — open Settings',
  undetermined: 'Not set',
};
const MOTION_LABEL: Record<MotionAvailability, string> = {
  available: 'On',
  denied: 'Off',
  unavailable: 'Not available',
};

export function SettingsSheet() {
  const unit = useSettingsStore((s) => s.distanceUnit);
  const setUnit = useSettingsStore((s) => s.setDistanceUnit);
  const fleet = useSettingsStore((s) => s.fleet);
  const driveCount = useRecentsStore((s) => s.drives.length);
  const clear = useRecentsStore((s) => s.clear);
  const [location, setLocation] = useState<LocationPermission | null>(null);
  const [motion, setMotion] = useState<MotionAvailability | null>(null);

  const refresh = useCallback(() => {
    void getLocationPermission().then(setLocation);
    void getMotionAvailability().then(setMotion);
  }, []);
  useEffect(() => {
    refresh();
    // Returning from the system Settings app does not remount the sheet.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  async function onLocation() {
    if (location === 'blocked') return openSystemSettings();
    setLocation(await requestLocationPermission());
  }
  async function onMotion() {
    if (motion === 'denied') {
      const next = await requestMotionPermission();
      setMotion(next);
      if (next === 'denied') openSystemSettings();
    }
  }
  function onClear() {
    Alert.alert('Clear all drives?', 'Every drive on this phone will be removed. Drives already shared with a fleet stay with the fleet.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  }

  return (
    <SheetScroll>
      <Group title="Permissions">
        <Row label="Location" value={location ? LOCATION_LABEL[location] : '…'} onPress={onLocation} />
        <Row label="Motion sensors" value={motion ? MOTION_LABEL[motion] : '…'} onPress={onMotion} last />
      </Group>

      <Group title="Units">
        <View style={styles.segmentRow}>
          <Text style={styles.rowLabel}>Distance</Text>
          <Segmented value={unit} options={[['km', 'Kilometres'], ['mi', 'Miles']]} onChange={setUnit} />
        </View>
      </Group>

      <Group title="Fleet">
        <Row
          label={fleet ? fleet.fleetName : 'Join a fleet'}
          value={fleet ? 'Sharing' : undefined}
          onPress={() => useJourneyStore.getState().openSheet({ kind: 'fleet' })}
          last
        />
      </Group>

      <Group title="Data">
        <Row label="Clear all drives" value={`${driveCount}`} onPress={onClear} destructive last disabled={driveCount === 0} />
      </Group>

      <Group title="About">
        <Row label="Version" value={Constants.expoConfig?.version ?? '–'} />
        <View style={styles.about}>
          <Text style={styles.aboutText}>
            MileWire records GPS position and motion-sensor readings only while Track mode is on. Drives stay on this phone unless
            you join a fleet.
          </Text>
        </View>
      </Group>
    </SheetScroll>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  last,
  destructive,
  disabled,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && { backgroundColor: Colors.surfaceSelected }, disabled && { opacity: 0.45 }]}>
      <Text style={[styles.rowLabel, destructive && { color: Colors.danger }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </Pressable>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {options.map(([key, label]) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(key)}
            style={[styles.segmentItem, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, overflow: 'hidden' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowLabel: { fontSize: 16, color: Colors.text, flexShrink: 1 },
  rowValue: { fontSize: 15, color: Colors.textSecondary },
  segmentRow: { padding: 12, gap: 10 },
  segment: { flexDirection: 'row', backgroundColor: Colors.surfaceSelected, borderRadius: Radius.sm, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.sm - 2 },
  segmentOn: { backgroundColor: Colors.background },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  segmentTextOn: { color: Colors.primary },
  about: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  aboutText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
});
