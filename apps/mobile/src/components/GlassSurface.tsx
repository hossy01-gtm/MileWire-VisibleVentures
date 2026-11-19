import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** Real iOS glass where the system has it; a translucent white card elsewhere. */
const HAS_GLASS = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();

type Props = {
  /** Corner radius; use half the shorter side for a capsule or circle. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Floating map chrome surface. The frost sits behind the children as a
 * sibling, never around a Pressable, so touches always reach the controls.
 */
export function GlassSurface({ radius = 26, style, children }: Props) {
  const shape = { borderRadius: radius };
  if (HAS_GLASS) {
    return (
      <View style={[shape, style]}>
        <GlassView style={[StyleSheet.absoluteFill, shape]} glassEffectStyle="regular" colorScheme="light" />
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.fallback, shape, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
