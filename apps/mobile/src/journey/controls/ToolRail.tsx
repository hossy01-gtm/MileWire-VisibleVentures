import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { Icon } from '@/components/Icon';

import type { RailTool } from '../sheetNav';
import { CONTROL_SIZE, GLYPH } from './chrome';

const PAD = 4;
const SEGMENT = CONTROL_SIZE - PAD * 2;
const TOOLS: RailTool[] = ['recents', 'settings'];
export const TOOL_RAIL_HEIGHT = SEGMENT * TOOLS.length + PAD * 2;

type Props = {
  /** Tool whose sheet is open, or null. */
  selected: RailTool | null;
  onSelect: (tool: RailTool) => void;
};

/**
 * Vertical glass rail at the top right of the map. Each button opens its sheet
 * over the map; a white lens slides to the tool whose sheet is open.
 */
export function ToolRail({ selected, onSelect }: Props) {
  const [lensY] = useState(() => new Animated.Value(0));
  const [lensOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (selected) {
      Animated.timing(lensY, {
        toValue: TOOLS.indexOf(selected) * SEGMENT,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
    Animated.timing(lensOpacity, { toValue: selected ? 1 : 0, duration: 120, useNativeDriver: true }).start();
  }, [selected, lensY, lensOpacity]);

  return (
    <GlassSurface radius={CONTROL_SIZE / 2} style={styles.rail}>
      <View style={styles.inner}>
        <Animated.View
          pointerEvents="none"
          style={[styles.lens, { opacity: lensOpacity, transform: [{ translateY: lensY }] }]}
        />
        <RailButton
          label="Recents"
          hint={selected === 'recents' ? 'Closes your drives.' : 'Opens your recorded drives.'}
          selected={selected === 'recents'}
          onPress={() => onSelect('recents')}
          testID="open-recents">
          <Icon ios="clock.fill" android="history" color={GLYPH} />
        </RailButton>
        <RailButton
          label="Settings"
          hint={selected === 'settings' ? 'Closes settings.' : 'Opens permissions, units and fleet.'}
          selected={selected === 'settings'}
          onPress={() => onSelect('settings')}
          testID="open-settings">
          <Icon ios="gearshape.fill" android="settings" color={GLYPH} />
        </RailButton>
      </View>
    </GlassSurface>
  );
}

function RailButton({
  label,
  hint,
  selected,
  onPress,
  testID,
  children,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={styles.button}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { width: CONTROL_SIZE, height: TOOL_RAIL_HEIGHT },
  inner: { flex: 1, padding: PAD },
  lens: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: SEGMENT,
    height: SEGMENT,
    borderRadius: SEGMENT / 2,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  button: { width: SEGMENT, height: SEGMENT, borderRadius: SEGMENT / 2, alignItems: 'center', justifyContent: 'center' },
});
