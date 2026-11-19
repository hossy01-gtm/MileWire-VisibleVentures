/**
 * Pure navigation rules for the map's overlay sheets and scenes. No React, no
 * platform imports, so they are unit-tested directly (`sheetNav.test.ts`).
 */

export type Sheet =
  | { kind: 'recents' }
  | { kind: 'settings' }
  | { kind: 'fleet' }
  /** One drive on the map. `from` decides where Back goes. */
  | { kind: 'drive'; id: string; from: 'recents' | 'finish' };

export type RailTool = 'recents' | 'settings';

/** browse: idle map. live: a drive is running. review: one drive laid out on the map. */
export type Scene = 'browse' | 'live' | 'review';

type Phase = 'idle' | 'starting' | 'tracking' | 'stopping';

/** The in-drive layer owns the screen for as long as a session exists. */
export function resolveScene(phase: Phase, sheet: Sheet | null): Scene {
  if (phase !== 'idle') return 'live';
  return sheet?.kind === 'drive' ? 'review' : 'browse';
}

/** Where Back goes from this sheet; null means Back closes the sheet. */
export function parentSheet(sheet: Sheet): Sheet | null {
  switch (sheet.kind) {
    case 'fleet':
      return { kind: 'settings' };
    case 'drive':
      return sheet.from === 'recents' ? { kind: 'recents' } : null;
    default:
      return null;
  }
}

/** Which rail button is lit while this sheet is open. */
export function railToolFor(sheet: Sheet | null): RailTool | null {
  if (!sheet) return null;
  return sheet.kind === 'recents' || sheet.kind === 'drive' ? 'recents' : 'settings';
}

/** Rail press: the lit tool closes its sheet, any other tool opens its own. */
export function toggleRail(current: Sheet | null, tool: RailTool): Sheet | null {
  if (railToolFor(current) === tool) return null;
  return { kind: tool };
}

/** Peek detent as a fraction of the space below the status bar. */
export function peekFraction(sheet: Sheet): number {
  return sheet.kind === 'drive' ? 0.48 : 0.65;
}

export const FULL_FRACTION = 0.92;
