import { Pressable, StyleSheet } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';

import { CONTROL_SIZE } from './chrome';

type Props = {
  onPress: () => void;
  /** Outline glyph while the camera is released, filled while it follows. */
  following?: boolean;
  testID?: string;
  label?: string;
  /** Tint the glyph (the in-drive rail uses neutral, browse uses bronze). */
  color?: string;
};

/** Glass "back to my position" button. */
export function RecenterButton({ onPress, following = false, testID = 'recenter', label = 'Recenter map', color = Colors.primary }: Props) {
  return (
    <GlassSurface radius={CONTROL_SIZE / 2} style={styles.fab}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
        <Icon ios={following ? 'location.fill' : 'location'} android="my_location" color={color} />
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  fab: { width: CONTROL_SIZE, height: CONTROL_SIZE },
  press: { flex: 1, borderRadius: CONTROL_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: 'rgba(255,255,255,0.94)' },
});
