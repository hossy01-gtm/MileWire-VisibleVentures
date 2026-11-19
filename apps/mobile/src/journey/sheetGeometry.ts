import { FULL_FRACTION } from './sheetNav';

/** Gap kept between the status bar and the top of a fully open sheet. */
export const SHEET_TOP_GAP = 8;

export type SheetGeometry = {
  /** Height of the sheet at its full detent; the sheet is always this tall. */
  fullH: number;
  /** Height of the part that shows at the peek detent. */
  peekH: number;
  /** translateY at the peek detent (0 is full, `closedY` is hidden). */
  peekY: number;
  closedY: number;
};

export function sheetGeometry(input: { viewportH: number; safeTop: number; peekFraction: number }): SheetGeometry {
  const available = Math.max(input.viewportH - (input.safeTop + SHEET_TOP_GAP), 0);
  const fullH = available * FULL_FRACTION;
  const peekH = available * input.peekFraction;
  return { fullH, peekH, peekY: Math.max(fullH - peekH, 0), closedY: fullH };
}

export type SnapTarget = 'full' | 'peek' | 'closed';

/** Release speed (px/ms) above which a drag is a flick and moves one detent. */
const FLICK_VY = 0.8;

function nearestDetent(y: number, peekY: number, closedY: number): SnapTarget {
  const d = { full: Math.abs(y), peek: Math.abs(y - peekY), closed: Math.abs(y - closedY) };
  if (d.full <= d.peek && d.full <= d.closed) return 'full';
  return d.peek <= d.closed ? 'peek' : 'closed';
}

/**
 * Where a released drag settles. `y` is the sheet's current translateY and
 * `vy` its release velocity in px/ms (positive = moving down). A flick moves
 * one detent in its direction; a slower release settles on the nearest detent
 * to where the sheet was heading.
 */
export function resolveSnapTarget(input: { y: number; vy: number; peekY: number; closedY: number }): SnapTarget {
  const { y, vy, peekY, closedY } = input;
  if (Math.abs(vy) >= FLICK_VY) {
    const here = nearestDetent(y, peekY, closedY);
    if (vy > 0) return here === 'full' ? 'peek' : 'closed';
    return here === 'closed' ? 'peek' : 'full';
  }
  return nearestDetent(y + vy * 120, peekY, closedY);
}
