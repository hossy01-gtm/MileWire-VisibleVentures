"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const REPLAY_SPEEDS = [1, 2, 4, 8, 16] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

/** The speed after `current`, wrapping back to the slowest. */
export const nextReplaySpeed = (current: ReplaySpeed): ReplaySpeed => REPLAY_SPEEDS[(REPLAY_SPEEDS.indexOf(current) + 1) % REPLAY_SPEEDS.length];

/**
 * Playback clock over `[0, durationMs]`. Time advances with real time scaled by
 * `speed` and is published ~20×/s — the 3D view smooths between updates.
 */
export function useReplayClock(durationMs: number) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(4);
  const tRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let lastPublish = 0;
    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      tRef.current = Math.min(durationMs, tRef.current + dt * speed);
      if (now - lastPublish >= 50 || tRef.current >= durationMs) {
        lastPublish = now;
        setT(tRef.current);
      }
      if (tRef.current >= durationMs) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, durationMs]);

  const seek = useCallback(
    (ms: number) => {
      tRef.current = Math.max(0, Math.min(durationMs, ms));
      setT(tRef.current);
    },
    [durationMs],
  );

  const toggle = useCallback(() => {
    if (tRef.current >= durationMs) {
      tRef.current = 0;
      setT(0);
    }
    setPlaying((p) => !p);
  }, [durationMs]);

  return { t, playing, speed, setSpeed, seek, toggle, pause: () => setPlaying(false) };
}
