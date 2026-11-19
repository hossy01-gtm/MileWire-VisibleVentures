import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Colors, Radius } from '@/constants/theme';
import { useSettingsStore } from '@/services/settings/settingsStore';
import { useTrackStore } from '@/services/tracking/trackingSession';

import { CONTROL_SIZE, EDGE_INSET, STACK_GAP } from '../controls/chrome';
import { ModePill } from '../controls/ModePill';
import { RecenterButton } from '../controls/RecenterButton';
import { SpeedOverlay } from '../controls/SpeedOverlay';
import { TOOL_RAIL_HEIGHT, ToolRail } from '../controls/ToolRail';
import { useCoverFade } from '../controls/useCoverFade';
import { useJourneyStore } from '../journeyStore';
import { railToolFor } from '../sheetNav';
import type { JourneyController } from '../useJourneyController';

type Props = { controller: JourneyController };

/**
 * Browse kit: the idle map. Tool rail and recenter at the top right, live speed
 * at the top left, and the Track mode pill along the bottom where a start
 * button would be. While a sheet is open at full height the top controls fade
 * out; the pill stays mounted underneath the sheet.
 */
export function BrowseKit({ controller }: Props) {
  const insets = useSafeAreaInsets();
  const sheet = useJourneyStore((s) => s.sheet);
  const snap = useJourneyStore((s) => s.snap);
  const following = useJourneyStore((s) => s.following);
  const setFollowing = useJourneyStore((s) => s.setFollowing);
  const toggleTool = useJourneyStore((s) => s.toggleTool);
  const phase = useTrackStore((s) => s.phase);
  const error = useTrackStore((s) => s.error);
  const dismissError = useTrackStore((s) => s.dismissError);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const fleet = useSettingsStore((s) => s.fleet);
  const shareLive = useSettingsStore((s) => s.shareLive);
  const { permission, granted, speedMps, confirming, startTracking, enableLocation } = controller;

  const covered = sheet != null && snap === 'full';
  const fade = useCoverFade(covered);
  const top = insets.top + STACK_GAP;
  const sharingWith = fleet && shareLive ? fleet.fleetName : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.left, { top, opacity: fade }]} pointerEvents="none">
        {granted ? <SpeedOverlay speedMps={speedMps} unit={unit} /> : null}
      </Animated.View>

      <Animated.View style={[styles.right, { top, opacity: fade }]} pointerEvents={covered ? 'none' : 'box-none'}>
        <ToolRail selected={railToolFor(sheet)} onSelect={toggleTool} />
        {granted && !following ? (
          <View style={{ marginTop: STACK_GAP }}>
            <RecenterButton onPress={() => setFollowing(true)} />
          </View>
        ) : null}
      </Animated.View>

      <View style={[styles.bottom, { bottom: insets.bottom + EDGE_INSET }]} pointerEvents="box-none">
        {error === 'location_failed' ? (
          <Card
            title="Couldn't read your location"
            body="Make sure you have a GPS signal, then try again."
            action="Try again"
            onAction={() => {
              dismissError();
              void startTracking();
            }}
          />
        ) : permission != null && !granted ? (
          <Card
            title="Turn on location"
            body="MileWire needs your location to show the map and to record the route and distance of a drive."
            action={permission === 'blocked' ? 'Open settings' : 'Allow location'}
            onAction={enableLocation}
            showLogo
          />
        ) : granted ? (
          <>
            {sharingWith ? (
              <View style={styles.fleetChip}>
                <View style={styles.fleetDot} />
                <Text style={styles.fleetText} numberOfLines={1}>
                  Drives shared with {sharingWith}
                </Text>
              </View>
            ) : null}
            <ModePill unit={unit} confirming={confirming} starting={phase === 'starting'} onStart={() => void startTracking()} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function Card({
  title,
  body,
  action,
  onAction,
  showLogo,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  showLogo?: boolean;
}) {
  return (
    <View style={styles.card}>
      {showLogo ? <Logo size={36} /> : null}
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      <Button title={action} onPress={onAction} style={styles.cardButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  left: { position: 'absolute', left: EDGE_INSET },
  right: { position: 'absolute', right: EDGE_INSET, width: CONTROL_SIZE, minHeight: TOOL_RAIL_HEIGHT },
  bottom: { position: 'absolute', left: EDGE_INSET, right: EDGE_INSET, gap: 10 },
  fleetChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    backgroundColor: Colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  fleetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand },
  fleetText: { fontSize: 13, fontWeight: '600', color: Colors.text, flexShrink: 1 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: 20,
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 4 },
  cardBody: { fontSize: 14, color: Colors.textSecondary },
  cardButton: { marginTop: 10 },
});
