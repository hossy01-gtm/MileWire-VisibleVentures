import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { formatSpeed, speedUnitLabel, type DistanceUnit } from '@/lib/format';
import { LATCH_SPEED_MPS } from '@/services/tracking/autoLatch';

import { PILL_HEIGHT } from './chrome';

/** How long the pill must be held before Track mode starts. */
export const HOLD_TO_TRACK_MS = 2_000;
const HINT_MS = 2_200;

type Props = {
  unit: DistanceUnit;
  /** A fix at driving speed has been seen; the auto-latch is about to start. */
  confirming: boolean;
  /** A session is already starting. */
  starting: boolean;
  /** Start Track mode now (the hold finished, or a screen reader activated it). */
  onStart: () => void;
};

function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isScreenReaderEnabled().then((v) => {
      if (!cancelled) setEnabled(v);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
  return enabled;
}

/**
 * The Track mode control, sitting where a start button would. Press and hold
 * to start straight away; otherwise it waits and the auto-latch starts the
 * drive once the phone reaches driving speed. A quick tap only explains this.
 */
export function ModePill({ unit, confirming, starting, onStart }: Props) {
  const [fill] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const holdCompleted = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const screenReader = useScreenReader();

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const onPressIn = useCallback(() => {
    holdCompleted.current = false;
    setHolding(true);
    setHint(false);
    fill.setValue(0);
    Animated.timing(fill, { toValue: 1, duration: HOLD_TO_TRACK_MS, easing: Easing.linear, useNativeDriver: true }).start();
    Animated.timing(scale, { toValue: 0.98, duration: 120, useNativeDriver: true }).start();
  }, [fill, scale]);

  const release = useCallback(() => {
    setHolding(false);
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: holdCompleted.current ? 220 : 120, useNativeDriver: true }).start();
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }, [fill, scale]);

  const onLongPress = useCallback(() => {
    holdCompleted.current = true;
    onStart();
  }, [onStart]);

  const onPress = useCallback(() => {
    // Fires only for a short tap: a completed hold goes to onLongPress.
    if (screenReader) {
      onStart();
      return;
    }
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
  }, [onStart, screenReader]);

  const threshold = `${formatSpeed(LATCH_SPEED_MPS, unit)} ${speedUnitLabel(unit)}`;
  const subtitle = starting
    ? 'Starting…'
    : holding
      ? 'Keep holding…'
      : hint
        ? 'Press and hold to start'
        : confirming
          ? 'Driving detected, starting…'
          : `Hold to start · starts by itself at ${threshold}`;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <GlassSurface radius={PILL_HEIGHT / 2} style={styles.pill}>
        <View style={styles.clip} pointerEvents="none">
          <Animated.View style={[styles.fill, { transform: [{ scaleX: fill }] }]} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track mode"
          accessibilityHint={`Press and hold to start tracking. It also starts by itself when you reach ${threshold}.`}
          accessibilityState={{ disabled: starting, busy: starting }}
          testID="track-pill"
          disabled={starting}
          delayLongPress={HOLD_TO_TRACK_MS}
          onPressIn={onPressIn}
          onPressOut={release}
          onLongPress={onLongPress}
          onPress={onPress}
          style={styles.content}>
          <View style={styles.badge}>
            <Icon ios="record.circle" android="fiber_manual_record" size={24} color={Colors.onPrimary} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>Track mode</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View style={[styles.dot, confirming || starting ? styles.dotLive : styles.dotWaiting]} />
        </Pressable>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { height: PILL_HEIGHT },
  clip: { ...StyleSheet.absoluteFill, borderRadius: PILL_HEIGHT / 2, overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(205,127,50,0.28)', transformOrigin: 'left center' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 12 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  dotWaiting: { backgroundColor: Colors.brand },
  dotLive: { backgroundColor: Colors.success },
});
