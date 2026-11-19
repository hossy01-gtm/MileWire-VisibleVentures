import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${unit ? ' ' + unit : ''}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { marginTop: 4, fontSize: 24, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
});
