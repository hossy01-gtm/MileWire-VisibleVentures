"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { DistanceUnit } from "./format";

const KEY = "milewire.unit";
const listeners = new Set<() => void>();

function read(): DistanceUnit {
  try {
    return window.localStorage.getItem(KEY) === "mi" ? "mi" : "km";
  } catch {
    return "km";
  }
}

/** Distance unit preference, shared across the console and persisted locally. */
export function useUnit(): [DistanceUnit, (u: DistanceUnit) => void] {
  const unit = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "km" as DistanceUnit,
  );
  const set = useCallback((u: DistanceUnit) => {
    try {
      window.localStorage.setItem(KEY, u);
    } catch {
      /* ignore blocked storage */
    }
    listeners.forEach((l) => l());
  }, []);
  return [unit, set];
}
