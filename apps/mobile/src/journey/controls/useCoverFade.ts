import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Opacity that fades to 0 while a sheet covers the chrome behind it (the full
 * detent) and back to 1 when it uncovers. Opacity only: the controls stay
 * mounted so nothing remounts mid-gesture.
 */
export function useCoverFade(covered: boolean): Animated.Value {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    Animated.timing(opacity, { toValue: covered ? 0 : 1, duration: 160, useNativeDriver: true }).start();
  }, [covered, opacity]);
  return opacity;
}
