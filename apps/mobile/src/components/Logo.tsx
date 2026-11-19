import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

const MARK = require('@/assets/images/splash-icon.png');

/** The bronze "M" mark, optionally with the wordmark beside it. */
export function Logo({ size = 40, wordmark = false }: { size?: number; wordmark?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="MileWire">
      <Image source={MARK} style={{ width: size, height: size, borderRadius: size * 0.22 }} contentFit="contain" />
      {wordmark ? <Text style={[styles.word, { fontSize: size * 0.55 }]}>MileWire</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
});
