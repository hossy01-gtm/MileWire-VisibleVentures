import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';

import { registerSheetDismiss, useJourneyStore } from '../journeyStore';
import { sheetGeometry } from '../sheetGeometry';
import { createSheetGesture } from './sheetGesture';

const SheetMetrics = createContext({ bottomPad: 24 });

/** Bottom padding a sheet's scrolling content needs so its last row clears the screen edge. */
export function useSheetBottomPad(): number {
  return useContext(SheetMetrics).bottomPad;
}

const SPRING = { damping: 32, stiffness: 260, mass: 0.85, overshootClamping: true } as const;

type Props = {
  title: string;
  /** Peek detent as a fraction of the space under the status bar. */
  peekFraction: number;
  /** Show a Back chevron (nested sheets). */
  onBack?: () => void;
  /** Called once the sheet has finished animating closed. */
  onClose: () => void;
  children: ReactNode;
};

/**
 * Bottom sheet that floats over the map, with a peek and a full detent.
 * Drag the handle or title to move it; flick down to close. The map stays
 * visible and interactive above it. Content scrolls on its own.
 */
export function ToolSheet({ title, peekFraction, onBack, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const geo = sheetGeometry({ viewportH: height, safeTop: insets.top, peekFraction });
  const snap = useJourneyStore((s) => s.snap);
  const setSnap = useJourneyStore((s) => s.setSnap);

  const [y] = useState(() => new Animated.Value(geo.closedY));
  const closing = useRef(false);
  const geoRef = useRef(geo);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    geoRef.current = geo;
    onCloseRef.current = onClose;
  });

  const animateTo = useCallback(
    (target: number, done?: () => void) => {
      Animated.spring(y, { ...SPRING, toValue: target, useNativeDriver: true }).start(({ finished }) => {
        if (finished) done?.();
      });
    },
    [y],
  );

  // Open (and re-seat when the detent or the available height changes).
  useEffect(() => {
    if (closing.current) return;
    animateTo(snap === 'full' ? 0 : geo.peekY, undefined);
  }, [snap, geo.peekY, animateTo]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    animateTo(geoRef.current.closedY, () => onCloseRef.current());
  }, [animateTo]);

  useEffect(() => {
    registerSheetDismiss(close);
    return () => registerSheetDismiss(null);
  }, [close]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      (onBack ?? close)();
      return true;
    });
    return () => sub.remove();
  }, [onBack, close]);

  // A keyboard needs the full detent: the sheet sits at the bottom of the screen.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setSnap('full'));
    return () => show.remove();
  }, [setSnap]);

  const [gesture] = useState(() => createSheetGesture(y));
  useEffect(() => gesture.attach(), [gesture]);
  useEffect(() => {
    gesture.update({
      geo,
      close,
      settleTo: (detent) => {
        setSnap(detent);
        animateTo(detent === 'full' ? 0 : geo.peekY);
      },
    });
  });

  // At the peek detent the lower part of the sheet is off screen; pad the
  // content so its last row can still be scrolled into view.
  const bottomPad = insets.bottom + 24 + (snap === 'peek' ? geo.fullH - geo.peekH : 0);

  return (
    <View style={styles.host} pointerEvents="box-none" testID="tool-sheet">
      <Animated.View style={[styles.sheet, { height: geo.fullH, transform: [{ translateY: y }] }]}>
        <View {...gesture.panHandlers} style={styles.dragArea}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {onBack ? (
              <CircleButton label="Back" testID="sheet-back" onPress={onBack}>
                <Icon ios="chevron.left" android="arrow_back" size={18} color={Colors.text} />
              </CircleButton>
            ) : null}
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            <CircleButton label={`Close ${title}`} testID="sheet-close" onPress={close}>
              <Icon ios="xmark" android="close" size={18} color={Colors.text} />
            </CircleButton>
          </View>
        </View>
        <SheetMetrics.Provider value={{ bottomPad }}>
          <View style={styles.body}>{children}</View>
        </SheetMetrics.Provider>
      </Animated.View>
    </View>
  );
}

/** Scrolling content area for a sheet body, with the standard inset and rhythm. */
export function SheetScroll({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const bottomPad = useSheetBottomPad();
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

function CircleButton({
  label,
  testID,
  onPress,
  children,
}: {
  label: string;
  testID: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Above the browse chrome so the dock sits underneath the sheet.
  host: { ...StyleSheet.absoluteFill, zIndex: 100, elevation: 100 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#141820',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    shadowOpacity: 0.14,
    elevation: 24,
  },
  dragArea: { paddingTop: 10 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(60,60,67,0.3)', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  title: { flex: 1, minWidth: 0, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: Colors.text },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  circlePressed: { backgroundColor: Colors.surfaceSelected },
  body: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
});
