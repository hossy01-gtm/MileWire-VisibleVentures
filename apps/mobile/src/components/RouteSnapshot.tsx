import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { layoutRouteSnapshot, toSegments } from '@/lib/routeSnapshot';
import type { PathPoint } from '@/services/tracking/types';

export const ROUTE_SNAPSHOT_SIZE = 80;
const PAD = 11;
const LINE = 3.5;
const DOT = 9;

type Props = {
  path: readonly PathPoint[];
  size?: number;
};

/**
 * A small north-up snapshot of where a drive went, drawn from its recorded
 * GPS path: bronze line, green start dot, red end dot. It is vector-drawn on
 * the phone, so it appears instantly, works offline, and the route is never
 * sent anywhere to be rendered.
 */
export function RouteSnapshot({ path, size = ROUTE_SNAPSHOT_SIZE }: Props) {
  const layout = useMemo(() => layoutRouteSnapshot(path, { width: size, height: size }, PAD), [path, size]);
  const segments = useMemo(() => (layout ? toSegments(layout.points) : []), [layout]);

  return (
    <View
      style={[styles.frame, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {layout ? (
        <>
          {segments.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: s.cx - (s.length + LINE) / 2,
                top: s.cy - LINE / 2,
                width: s.length + LINE, // overhang so round ends overlap into a smooth join
                height: LINE,
                borderRadius: LINE / 2,
                backgroundColor: Colors.accent,
                transform: [{ rotate: `${s.angle}rad` }],
              }}
            />
          ))}
          <Dot at={layout.start} color={Colors.success} />
          {segments.length > 0 ? <Dot at={layout.end} color={Colors.danger} /> : null}
        </>
      ) : null}
    </View>
  );
}

function Dot({ at, color }: { at: { x: number; y: number }; color: string }) {
  return (
    <View
      style={[styles.dot, { left: at.x - DOT / 2, top: at.y - DOT / 2, backgroundColor: color }]}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSelected,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: Colors.mapCasing,
  },
});
