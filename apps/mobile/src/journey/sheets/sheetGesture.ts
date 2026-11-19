import { PanResponder, type Animated, type GestureResponderHandlers } from 'react-native';

import { resolveSnapTarget, type SheetGeometry } from '../sheetGeometry';

type Deps = {
  geo: SheetGeometry;
  /** Animate closed, then unmount. */
  close: () => void;
  /** Settle on a detent. */
  settleTo: (detent: 'full' | 'peek') => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Vertical drag on a sheet's handle and title. Plain closure state, kept out of
 * React on purpose: the gesture runs on every touch event and only ever reads
 * the latest geometry and callbacks, which the sheet pushes in through `update`.
 */
export function createSheetGesture(y: Animated.Value): {
  panHandlers: GestureResponderHandlers;
  update: (deps: Deps) => void;
  /** Start tracking the sheet's live offset; returns the cleanup. */
  attach: () => () => void;
} {
  let deps: Deps | null = null;
  let current = 0;
  let startY = 0;

  const settle = (dy: number, vy: number) => {
    if (!deps) return;
    const { geo } = deps;
    const at = clamp(startY + dy, 0, geo.closedY);
    const target = resolveSnapTarget({ y: at, vy, peekY: geo.peekY, closedY: geo.closedY });
    if (target === 'closed') deps.close();
    else deps.settleTo(target);
  };

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => {
      startY = current;
      // Catch the sheet mid-animation: the exact value arrives a tick later.
      y.stopAnimation((v) => {
        startY = v;
        current = v;
      });
    },
    onPanResponderMove: (_, g) => {
      if (deps) y.setValue(clamp(startY + g.dy, 0, deps.geo.closedY));
    },
    onPanResponderRelease: (_, g) => settle(g.dy, g.vy),
    onPanResponderTerminate: (_, g) => settle(g.dy, 0),
  });

  return {
    panHandlers: responder.panHandlers,
    update(next) {
      deps = next;
    },
    attach() {
      const id = y.addListener(({ value }) => {
        current = value;
      });
      return () => y.removeListener(id);
    },
  };
}
