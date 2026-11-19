import type { Scene } from './sheetNav';

export type MapPadding = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

type Input = {
  scene: Scene;
  /** Height of the open sheet at its peek detent, or null when none is open. */
  sheetPeekH: number | null;
  safeTop: number;
  safeBottom: number;
};

/**
 * How much of the map the chrome covers, so the puck and the route stay in the
 * visible part. While a sheet is open the padding stays latched at the peek
 * height, and does not jump when the sheet is dragged to full.
 */
export function resolveMapPadding({ scene, sheetPeekH, safeTop, safeBottom }: Input): MapPadding {
  if (scene === 'review') {
    return { paddingTop: safeTop + 64, paddingBottom: (sheetPeekH ?? 0) + 24, paddingLeft: 40, paddingRight: 40 };
  }
  if (sheetPeekH != null) {
    return { paddingTop: safeTop, paddingBottom: sheetPeekH, paddingLeft: 0, paddingRight: 0 };
  }
  if (scene === 'live') {
    // Top card above, speed gauge + stats dock below.
    return { paddingTop: safeTop + 90, paddingBottom: safeBottom + 150, paddingLeft: 0, paddingRight: 0 };
  }
  // Browse: keep the puck clear of the mode pill.
  return { paddingTop: 0, paddingBottom: safeBottom + 96, paddingLeft: 0, paddingRight: 0 };
}
