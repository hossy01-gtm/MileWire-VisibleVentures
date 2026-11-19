import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Colors, Radius } from '@/constants/theme';
import { hasSupabase } from '@/lib/config';
import { joinFleet, leaveFleet, normalizeJoinCode } from '@/services/fleet/fleetService';
import { useSettingsStore } from '@/services/settings/settingsStore';

import { useJourneyStore } from '../journeyStore';
import { SheetScroll } from './ToolSheet';

export function FleetSheet() {
  const fleet = useSettingsStore((s) => s.fleet);
  const shareLive = useSettingsStore((s) => s.shareLive);
  const setShareLive = useSettingsStore((s) => s.setShareLive);
  const [code, setCode] = useState('');
  const [name, setName] = useState(fleet?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onJoin() {
    setBusy(true);
    setMessage(null);
    const result = await joinFleet(code, name);
    setBusy(false);
    if (result.ok) useJourneyStore.getState().backSheet();
    else setMessage(result.message);
  }

  function onLeave() {
    Alert.alert('Leave this fleet?', 'Your future drives will no longer be shared. Drives already shared stay with the fleet.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveFleet();
          useJourneyStore.getState().backSheet();
        },
      },
    ]);
  }

  if (!hasSupabase) {
    return (
      <SheetScroll>
        <Text style={styles.heading}>Fleet sharing unavailable</Text>
        <Text style={styles.body}>This build is not connected to a MileWire fleet service, so drives stay on this phone.</Text>
      </SheetScroll>
    );
  }

  if (fleet) {
    return (
      <SheetScroll>
        <View style={styles.card}>
          <Text style={styles.label}>Fleet</Text>
          <Text style={styles.value}>{fleet.fleetName}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Shown to your manager as</Text>
          <Text style={styles.value}>{fleet.displayName}</Text>
        </View>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.toggleTitle}>Share live location</Text>
            <Text style={styles.body}>While Track mode is on, your position appears on the fleet&apos;s live map.</Text>
          </View>
          <Switch value={shareLive} onValueChange={setShareLive} trackColor={{ true: Colors.brand }} />
        </View>
        <Text style={styles.body}>Completed drives are always shared with this fleet while you are a member.</Text>
        <Button title="Leave fleet" variant="danger" onPress={onLeave} />
      </SheetScroll>
    );
  }

  return (
    <SheetScroll>
      <Text style={styles.heading}>Join a fleet</Text>
      <Text style={styles.body}>
        Enter the code your fleet manager gave you. Joining shares your completed drives — and, while Track mode is on, your live
        location — with that fleet&apos;s managers. You can leave any time.
      </Text>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Join code</Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(normalizeJoinCode(t))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          placeholder="e.g. K7QM2X"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          accessibilityLabel="Join code"
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={40}
          placeholder="Name your manager will see"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          accessibilityLabel="Your name"
        />
      </View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Button title="Join fleet" onPress={onJoin} loading={busy} disabled={code.length < 4 || name.trim().length < 2} />
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '800', color: Colors.text },
  body: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  input: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 17,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  error: { color: Colors.danger, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.surface, borderRadius: Radius.md },
  toggleTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
});
