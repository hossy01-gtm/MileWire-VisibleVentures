import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Stat } from '@/components/Stat';
import { Colors, Radius } from '@/constants/theme';
import { formatDistance, formatDuration, formatSpeed, impactsPerKm, speedUnitLabel } from '@/lib/format';
import { uploadDrive } from '@/services/fleet/fleetService';
import { useRecentsStore } from '@/services/recents/recentsStore';
import { useSettingsStore } from '@/services/settings/settingsStore';

import { useJourneyStore } from '../journeyStore';
import { SheetScroll } from './ToolSheet';

/**
 * One drive. The route itself is drawn on the map underneath; this sheet holds
 * the numbers, the fleet-sync status and delete.
 */
export function DriveSheet({ id }: { id: string }) {
  const drive = useRecentsStore((s) => s.drives.find((d) => d.id === id));
  const remove = useRecentsStore((s) => s.remove);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const backSheet = useJourneyStore((s) => s.backSheet);
  const [retrying, setRetrying] = useState(false);

  if (!drive) {
    return (
      <SheetScroll>
        <Text style={styles.heading}>Drive not found</Text>
        <Text style={styles.sub}>It may have been deleted.</Text>
        <Button title="Back" onPress={backSheet} />
      </SheetScroll>
    );
  }

  const perKm = impactsPerKm(drive.joltCount, drive.distanceM);
  const started = new Date(drive.startedAt);

  async function retry() {
    if (!drive) return;
    setRetrying(true);
    await uploadDrive(drive);
    setRetrying(false);
  }

  function confirmDelete() {
    Alert.alert('Delete this drive?', 'It will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(id);
          backSheet();
        },
      },
    ]);
  }

  return (
    <SheetScroll>
      <Text style={styles.sub}>
        {started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        {drive.status === 'active' ? ' · Interrupted — saved up to the last checkpoint' : ''}
      </Text>

      <View style={styles.grid}>
        <Stat label="Distance" value={formatDistance(drive.distanceM, unit)} />
        <Stat label="Duration" value={formatDuration(drive.durationMs)} />
        <Stat label="Avg speed" value={formatSpeed(drive.avgSpeedMps, unit)} unit={speedUnitLabel(unit)} />
        <Stat label="Top speed" value={formatSpeed(drive.maxSpeedMps, unit)} unit={speedUnitLabel(unit)} />
        <Stat label="Bumps" value={String(drive.joltCount)} />
        <Stat label={`Bumps / ${unit}`} value={perKm == null ? '–' : (unit === 'mi' ? perKm * 1.609344 : perKm).toFixed(1)} />
      </View>

      {drive.fleetId ? (
        <View style={styles.sync}>
          <Text style={styles.syncText}>{drive.uploadedAt ? 'Shared with your fleet' : 'Waiting to share with your fleet'}</Text>
          {!drive.uploadedAt && drive.status === 'completed' ? (
            <Button title="Try again" variant="secondary" loading={retrying} onPress={retry} style={styles.retry} />
          ) : null}
        </View>
      ) : null}

      {drive.motion && drive.motion.length > 0 ? (
        <Text style={styles.meta}>
          Motion: {drive.motion.length} readings · peak {Math.max(...drive.motion.map((p) => p[1])).toFixed(2)} g
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {drive.gpsSamples} GPS fixes · {drive.gpsGaps} gap{drive.gpsGaps === 1 ? '' : 's'}
      </Text>
      <Button title="Delete drive" variant="ghost" onPress={confirmDelete} />
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 14, color: Colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sync: { backgroundColor: Colors.primarySoft, borderRadius: Radius.md, padding: 14, gap: 10 },
  syncText: { color: Colors.accent, fontWeight: '600', fontSize: 14 },
  retry: { minHeight: 40 },
  meta: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
});
