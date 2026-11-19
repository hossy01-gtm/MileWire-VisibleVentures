"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();

/**
 * A string kept in localStorage and shared between components. Reads as `null`
 * on the server and on first paint, so there is no hydration mismatch.
 */
export function useStoredString(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      const set = listeners.get(key) ?? new Set();
      set.add(cb);
      listeners.set(key, set);
      return () => set.delete(cb);
    },
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const set = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* blocked storage: the choice just won't persist */
      }
      listeners.get(key)?.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
