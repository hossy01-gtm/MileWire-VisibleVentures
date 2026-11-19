import { create } from 'zustand';

import type { SimStatus } from './types';
import type { TestingManager } from './testingManager';

export type DevSimulationState = {
  enabled: boolean;
  objective: string;
  objectives: string[];
  status: SimStatus;
  /** 0..1 along the selected route. */
  progress: number;
  /** Last objective switch failed (unknown objective or unreadable GPX). */
  error: boolean;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  rewind: () => Promise<void>;
  selectObjective: (name: string) => Promise<void>;
};

/**
 * The UI-facing handle on the simulation. A dev panel binds to this (state for
 * display, actions for buttons); the simulation itself never reads it, so it
 * works the same with no panel mounted.
 */
export function createDevSimulationStore(manager: TestingManager) {
  const store = create<DevSimulationState>((set) => ({
    enabled: manager.isEnabled(),
    objective: manager.getObjective(),
    objectives: manager.getObjectives(),
    status: manager.gps.getSnapshot().status,
    progress: 0,
    error: false,
    async play() {
      if (await manager.ready()) manager.gps.play();
    },
    pause() {
      manager.gps.pause();
    },
    async toggle() {
      if (await manager.ready()) manager.gps.toggle();
    },
    async rewind() {
      if (await manager.ready()) manager.gps.rewind();
    },
    async selectObjective(name) {
      const ok = await manager.selectObjective(name);
      set({ objective: manager.getObjective(), error: !ok });
    },
  }));

  manager.gps.onSnapshot((snap) => store.setState({ status: snap.status, progress: snap.progress }));
  return store;
}
