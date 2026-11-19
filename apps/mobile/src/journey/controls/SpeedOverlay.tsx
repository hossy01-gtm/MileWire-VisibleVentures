import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { formatSpeed, speedUnitLabel, type DistanceUnit } from '@/lib/format';

import { GlassSurface } from '@/components/GlassSurface';

/** Hide the readout this long after the phone stops moving. */
const IDLE_HIDE_MS = 3_000;
/** Below this the phone is treated as standing still (m/s, about 3.6 km/h). */
const MOVING_MPS = 1;

/**
 * Live ground speed at the top left of the idle map. Fades out (opacity only,
 * it stays mounted) a few seconds after the phone stops, and gives the driver
 * a way to watch the speed climb toward the auto-latch.
 */
export function SpeedOverlay({ speedMps, unit }: { speedMps: number | null; unit: DistanceUnit }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moving = speedMps != null && speedMps >= MOVING_MPS;

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (moving) {
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    } else {
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      }, IDLE_HIDE_MS);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [moving, opacity]);

  return (
    <Animated.View style={{ opacity }} pointerEvents="none">
      <GlassSurface radius={18} style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.value} accessibilityLabel={`Speed ${formatSpeed(speedMps, unit)} ${speedUnitLabel(unit)}`}>
            {formatSpeed(speedMps, unit)}
          </Text>
          <Text style={styles.unit}>{speedUnitLabel(unit)}</Text>
        </View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  value: { fontSize: 26, fontWeight: '800', color: Colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
});
