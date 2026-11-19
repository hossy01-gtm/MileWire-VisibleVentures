import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/GlassSurface';
import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { formatClock, formatDistance, formatSpeed, speedUnitLabel } from '@/lib/format';
import { useSettingsStore } from '@/services/settings/settingsStore';
import { useTrackStore } from '@/services/tracking/trackingSession';

import { CONTROL_SIZE, EDGE_INSET, STACK_GAP } from '../controls/chrome';
import { RecenterButton } from '../controls/RecenterButton';
import { useJourneyStore } from '../journeyStore';

const TOP_CARD_H = 64;
const DOCK_H = 88;

type Props = { onStop: () => void };

/**
 * The in-drive layer. Separate from browse on purpose: a frosted status card
 * across the top, a side rail with recenter and Stop, and along the bottom a
 * speed gauge beside the distance / average / bumps dock. The idle controls
 * (Recents, Settings, the Track pill) do not exist while a drive is running.
 */
export function LiveKit({ onStop }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const phase = useTrackStore((s) => s.phase);
  const drive = useTrackStore((s) => s.drive);
  const lastFix = useTrackStore((s) => s.lastFix);
  const motion = useTrackStore((s) => s.motion);
  const unit = useSettingsStore((s) => s.distanceUnit);
  const fleet = useSettingsStore((s) => s.fleet);
  const shareLive = useSettingsStore((s) => s.shareLive);
  const following = useJourneyStore((s) => s.following);
  const setFollowing = useJourneyStore((s) => s.setFollowing);

  const live = phase === 'tracking';
  const speed = lastFix?.speed ?? null;
  const weakGps = lastFix?.accuracy != null && lastFix.accuracy > 30;
  const noMotion = motion === 'unavailable' || motion === 'denied';
  const sharingWith = fleet && shareLive ? fleet.fleetName : null;

  const top = insets.top + STACK_GAP;
  const railTop = top + TOP_CARD_H + STACK_GAP;
  const bottom = insets.bottom + EDGE_INSET;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Status card */}
      <GlassSurface radius={22} style={[styles.topCard, { top }]}>
        <View style={styles.topRow} accessibilityRole="header">
          <LiveDot live={live} />
          <View style={styles.topText}>
            <Text style={styles.topTitle}>{live ? 'Tracking' : 'Starting…'}</Text>
            <Text style={styles.topSub} numberOfLines={1}>
              {sharingWith ? `Sharing live with ${sharingWith}` : 'Recording route and bumps'}
            </Text>
          </View>
          <Text style={styles.clock} accessibilityLabel={`Elapsed ${formatClock(drive?.durationMs ?? 0)}`}>
            {formatClock(drive?.durationMs ?? 0)}
          </Text>
        </View>
      </GlassSurface>

      {/* Sensor cues, left of the side rail */}
      {weakGps || noMotion ? (
        <View style={[styles.cues, { top: railTop }]} pointerEvents="none">
          {weakGps ? <Cue text="GPS signal weak" /> : null}
          {noMotion ? <Cue text="No motion sensor" /> : null}
        </View>
      ) : null}

      {/* Side rail: recenter, then Stop */}
      <View style={[styles.rail, { top: railTop }]}>
        <RecenterButton
          following={following}
          onPress={() => setFollowing(true)}
          color={Colors.text}
          testID="recenter"
        />
        <GlassSurface radius={CONTROL_SIZE / 2} style={styles.stopWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop tracking"
            testID="stop-track"
            disabled={!live}
            onPress={onStop}
            style={({ pressed }) => [styles.stop, pressed && styles.stopPressed, !live && { opacity: 0.45 }]}>
            <Icon ios="stop.fill" android="stop" size={22} color={Colors.danger} />
          </Pressable>
        </GlassSurface>
      </View>

      {/* Bottom: speed gauge + stats dock */}
      <View style={[styles.bottom, { bottom }]} pointerEvents="box-none">
        <GlassSurface radius={DOCK_H / 2} style={styles.gauge}>
          <View style={styles.gaugeInner} accessible accessibilityLabel={`Speed ${formatSpeed(speed, unit)} ${speedUnitLabel(unit)}`}>
            <Text style={styles.speed}>{formatSpeed(speed, unit)}</Text>
            <Text style={styles.speedUnit}>{speedUnitLabel(unit)}</Text>
          </View>
        </GlassSurface>
        <GlassSurface radius={28} style={styles.dock}>
          <View style={styles.dockRow}>
            <Metric label="Distance" value={formatDistance(drive?.distanceM ?? 0, unit)} />
            <View style={styles.sep} />
            <Metric label="Avg speed" value={formatSpeed(drive?.avgSpeedMps ?? null, unit)} unit={speedUnitLabel(unit)} />
            <View style={styles.sep} />
            <Metric label="Bumps" value={String(drive?.joltCount ?? 0)} />
          </View>
        </GlassSurface>
      </View>
    </View>
  );
}

function LiveDot({ live }: { live: boolean }) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);
  return <Animated.View style={[styles.dot, live ? styles.dotLive : styles.dotIdle, live && { opacity: pulse }]} />;
}

function Cue({ text }: { text: string }) {
  return (
    <View style={styles.cue}>
      <Text style={styles.cueText}>{text}</Text>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label} ${value}${unit ? ' ' + unit : ''}`}>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topCard: { position: 'absolute', left: EDGE_INSET, right: EDGE_INSET, height: TOP_CARD_H },
  topRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12 },
  topText: { flex: 1, minWidth: 0, gap: 1 },
  topTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  topSub: { fontSize: 13, color: Colors.textSecondary },
  clock: { fontSize: 24, fontWeight: '800', color: Colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotLive: { backgroundColor: Colors.success },
  dotIdle: { backgroundColor: Colors.textTertiary },
  cues: { position: 'absolute', left: EDGE_INSET, right: EDGE_INSET + CONTROL_SIZE + STACK_GAP, gap: 6, alignItems: 'flex-start' },
  cue: { backgroundColor: '#FFF4E0', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  cueText: { fontSize: 13, fontWeight: '600', color: Colors.warning },
  rail: { position: 'absolute', right: EDGE_INSET, gap: STACK_GAP },
  stopWrap: { width: CONTROL_SIZE, height: CONTROL_SIZE },
  stop: { flex: 1, borderRadius: CONTROL_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  stopPressed: { backgroundColor: 'rgba(179,38,30,0.12)' },
  bottom: { position: 'absolute', left: EDGE_INSET, right: EDGE_INSET, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gauge: { width: DOCK_H, height: DOCK_H },
  gaugeInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  speed: { fontSize: 34, fontWeight: '800', color: Colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.8, lineHeight: 38 },
  speedUnit: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  dock: { flex: 1, height: DOCK_H },
  dockRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  sep: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: 'rgba(60,60,67,0.25)' },
  metric: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  metricValue: { fontSize: 19, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  metricUnit: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  metricLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
});
