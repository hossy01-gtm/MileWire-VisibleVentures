"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { repo } from "@/lib/data";
import type { Fleet } from "@/lib/types";
import { useAsyncData } from "@/lib/use-async-data";
import { useStoredString } from "@/lib/use-stored-string";

type FleetCtx = {
  fleets: Fleet[];
  loading: boolean;
  error: string | null;
  /** Fleet the map and live views operate on. */
  active: Fleet | null;
  setActiveId: (id: string) => void;
  reload: () => void;
};

const Ctx = createContext<FleetCtx | null>(null);
const STORAGE_KEY = "milewire.activeFleet";

export function FleetProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useAsyncData(() => repo.listFleets(), []);
  const [activeId, setActiveId] = useStoredString(STORAGE_KEY);

  const fleets = useMemo(() => data ?? [], [data]);
  const active = fleets.find((f) => f.id === activeId) ?? fleets[0] ?? null;

  const value = useMemo(() => ({ fleets, loading, error, active, setActiveId, reload: refresh }), [fleets, loading, error, active, setActiveId, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFleets(): FleetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFleets must be used inside <FleetProvider>");
  return v;
}
