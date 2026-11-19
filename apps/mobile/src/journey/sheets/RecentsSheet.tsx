import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';

import { DriveRow } from '@/components/DriveRow';
import { Colors } from '@/constants/theme';
import { formatDayHeading } from '@/lib/format';
import { useRecentsStore } from '@/services/recents/recentsStore';
import { useSettingsStore } from '@/services/settings/settingsStore';
import type { DriveRecord } from '@/services/tracking/types';

import { useJourneyStore } from '../journeyStore';
import { useSheetBottomPad } from './ToolSheet';

function groupByDay(drives: DriveRecord[]) {
  const groups = new Map<string, DriveRecord[]>();
  for (const d of drives) {
    const day = new Date(d.startedAt);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.values()].map((data) => ({ title: formatDayHeading(data[0].startedAt), data }));
}

/** Every recorded drive, newest first, each with a snapshot of the route taken. */
export function RecentsSheet() {
  const bottomPad = useSheetBottomPad();
  const drives = useRecentsStore((s) => s.drives);
  const remove = useRecentsStore((s) => s.remove);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const openSheet = useJourneyStore((s) => s.openSheet);
  const sections = groupByDay(drives);

  function confirmDelete(d: DriveRecord) {
    Alert.alert('Delete this drive?', 'It will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(d.id) },
    ]);
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(d) => d.id}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
      renderItem={({ item }) => (
        <DriveRow
          drive={item}
          unit={unit}
          onPress={() => openSheet({ kind: 'drive', id: item.id, from: 'recents' })}
          onLongPress={() => confirmDelete(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No drives yet</Text>
          <Text style={styles.emptyBody}>
            Press and hold Track mode on the map, or just start driving, and your drives will be listed here.
          </Text>
        </View>
      }
      ListFooterComponent={drives.length > 0 ? <Text style={styles.footer}>Press and hold a drive to delete it.</Text> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, flexGrow: 1 },
  day: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  empty: { marginTop: 48, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', maxWidth: 280 },
  footer: { marginTop: 16, fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
});
