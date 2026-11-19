"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = { data: T | undefined; error: string | null; loading: boolean };

/**
 * Load data on mount and whenever `deps` change; optionally poll.
 * Keeps the previous data on screen while refreshing, so polling never flashes.
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: readonly unknown[], pollMs?: number) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await loadRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (e) {
        if (!cancelled) setState((s) => ({ data: s.data, error: e instanceof Error ? e.message : "Something went wrong", loading: false }));
      }
    };
    setState((s) => (s.loading ? s : { ...s, loading: s.data === undefined }));
    void run();
    const timer = pollMs ? setInterval(run, pollMs) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's dependency list
  }, [...deps, pollMs, tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, refresh };
}
