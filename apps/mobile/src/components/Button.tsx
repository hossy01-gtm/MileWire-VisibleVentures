import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, testID }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      testID={testID}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        pressed && variantStyles[variant].pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].textColor} />
      ) : (
        <Text style={[styles.label, { color: variantStyles[variant].textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});

const variantStyles: Record<
  Variant,
  { container: ViewStyle; pressed: ViewStyle; textColor: string }
> = {
  primary: {
    container: { backgroundColor: Colors.primary },
    pressed: { backgroundColor: Colors.primaryPressed },
    textColor: Colors.onPrimary,
  },
  secondary: {
    container: { backgroundColor: Colors.primarySoft },
    pressed: { backgroundColor: Colors.surfaceSelected },
    textColor: Colors.accent,
  },
  danger: {
    container: { backgroundColor: Colors.dangerSolid },
    pressed: { backgroundColor: Colors.dangerPressed },
    textColor: Colors.onPrimary,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    pressed: { backgroundColor: Colors.surface },
    textColor: Colors.accent,
  },
};
