import { create } from 'zustand';

import { parentSheet, toggleRail, type RailTool, type Sheet } from './sheetNav';

export type SheetSnap = 'peek' | 'full';

type JourneyState = {
  /** The open overlay sheet, if any. Not persisted: the app always opens on the bare map. */
  sheet: Sheet | null;
  /** Settled detent of the open sheet. */
  snap: SheetSnap;
  /** The camera is following the user (false once the map has been moved away). */
  following: boolean;
  openSheet: (sheet: Sheet) => void;
  /** Rail press: close the lit tool's sheet, or open this one. */
  toggleTool: (tool: RailTool) => void;
  /** Back to the parent sheet, or close when there is none. */
  backSheet: () => void;
  /** Close immediately, with no animation (the sheet is already gone or must go now). */
  closeSheet: () => void;
  setSnap: (snap: SheetSnap) => void;
  setFollowing: (following: boolean) => void;
};

/** Closes the open sheet with its exit animation; registered by the mounted sheet. */
let dismissHandler: (() => void) | null = null;

export function registerSheetDismiss(handler: (() => void) | null): void {
  dismissHandler = handler;
}

/** Animate the open sheet closed; falls back to an immediate close. */
export function dismissSheet(): void {
  if (dismissHandler) dismissHandler();
  else useJourneyStore.getState().closeSheet();
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  sheet: null,
  snap: 'peek',
  following: true,

  openSheet(sheet) {
    const prev = get().sheet;
    set({
      sheet,
      // A fresh open starts at the peek detent; switching sheets keeps the current one.
      snap: prev ? get().snap : 'peek',
      // Entering or leaving a drive review re-engages the camera on the user.
      following: sheet.kind === 'drive' || prev?.kind === 'drive' ? true : get().following,
    });
  },

  toggleTool(tool) {
    const { sheet, openSheet } = get();
    const next = toggleRail(sheet, tool);
    if (next) openSheet(next);
    else dismissSheet();
  },

  backSheet() {
    const { sheet, openSheet } = get();
    if (!sheet) return;
    const parent = parentSheet(sheet);
    if (parent) openSheet(parent);
    else dismissSheet();
  },

  closeSheet() {
    const prev = get().sheet;
    set({ sheet: null, snap: 'peek', following: prev?.kind === 'drive' ? true : get().following });
  },

  setSnap(snap) {
    set({ snap });
  },

  setFollowing(following) {
    if (get().following !== following) set({ following });
  },
}));
