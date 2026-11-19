import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { formatDistance, formatDuration, formatTimeOfDay, type DistanceUnit } from '@/lib/format';
import type { DriveRecord } from '@/services/tracking/types';

import { Icon } from './Icon';
import { RouteSnapshot } from './RouteSnapshot';

type Props = {
  drive: DriveRecord;
  unit: DistanceUnit;
  onPress: () => void;
  onLongPress?: () => void;
};

/** One recorded drive: route snapshot on the left, headline numbers beside it. */
export function DriveRow({ drive, unit, onPress, onLongPress }: Props) {
  const interrupted = drive.status === 'active';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Drive at ${formatTimeOfDay(drive.startedAt)}, ${formatDistance(drive.distanceM, unit)}`}
      accessibilityHint="Shows this drive on the map."
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <RouteSnapshot path={drive.path} />
      <View style={styles.main}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {formatTimeOfDay(drive.startedAt)}
          {interrupted ? <Text style={styles.warn}>  ·  Interrupted</Text> : null}
        </Text>
        <Text style={styles.distance} numberOfLines={1}>
          {formatDistance(drive.distanceM, unit)}
        </Text>
        <View style={styles.metrics}>
          <Text style={styles.metric}>{formatDuration(drive.durationMs)}</Text>
          <View style={styles.divider} />
          <Text style={styles.metric}>
            {drive.joltCount} bump{drive.joltCount === 1 ? '' : 's'}
          </Text>
          {drive.fleetId ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.metric}>{drive.uploadedAt ? 'Shared' : 'Waiting'}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.chevron} pointerEvents="none">
        <Icon ios="chevron.right" android="chevron_right" size={14} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.surfaceSelected },
  main: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '500', color: Colors.textTertiary, letterSpacing: -0.1 },
  warn: { color: Colors.warning, fontWeight: '600' },
  distance: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metric: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, letterSpacing: -0.1 },
  divider: { width: 1, height: 12, backgroundColor: Colors.border },
  chevron: { alignSelf: 'center' },
});
