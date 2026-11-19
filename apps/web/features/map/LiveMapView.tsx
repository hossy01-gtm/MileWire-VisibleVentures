"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CubeIcon } from "@/components/icons";
import { useFleets } from "@/components/layout/FleetProvider";
import { Badge, EmptyState, Spinner, cn } from "@/components/ui";
import { repo } from "@/lib/data";
import { formatAgo, formatDateTime, formatDistance, formatSpeed } from "@/lib/format";
import { useAsyncData } from "@/lib/use-async-data";
import { useUnit } from "@/lib/use-unit";
import { FleetMap } from "./FleetMap";

const POLL_MS = 4000;

/** Fleet-wide live map: who is driving now, plus recent drives to inspect. */
export function LiveMapView() {
  const router = useRouter();
  const { active, loading: fleetsLoading } = useFleets();
  const [unit] = useUnit();
  const [selected, setSelected] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [tab, setTab] = useState<"live" | "recent">("live");

  const { data: live } = useAsyncData(() => (active ? repo.listLive(active.id) : Promise.resolve([])), [active?.id], POLL_MS);
  const { data: members } = useAsyncData(() => (active ? repo.listMembers(active.id) : Promise.resolve([])), [active?.id]);
  const { data: recent } = useAsyncData(() => (active ? repo.listDrives({ fleetId: active.id, limit: 20 }) : Promise.resolve([])), [active?.id]);
  const { data: routeDrive } = useAsyncData(() => (routeId ? repo.getDrive(routeId) : Promise.resolve(null)), [routeId]);

  const names = new Map((members ?? []).map((m) => [m.userId, m.displayName]));

  if (fleetsLoading) return <div className="p-8"><Spinner label="Loading fleets" /></div>;
  if (!active) {
    return (
      <div className="p-8">
        <EmptyState
          title="Create a fleet to see it on the map"
          body="A fleet groups your drivers. Drivers join with a code from the MileWire app."
          action={<Link href="/fleets" className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover">Go to fleets</Link>}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex max-h-[42vh] w-full shrink-0 flex-col border-b border-border bg-surface md:max-h-none md:w-80 md:border-b-0 md:border-r">
        <div className="border-b border-border p-3">
          <h1 className="truncate text-sm font-semibold">{active.name}</h1>
          <p className="text-xs text-muted">{(live ?? []).length} driving now</p>
          <div role="tablist" className="mt-3 inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
            {(["live", "recent"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("h-7 rounded-md px-3 text-xs font-medium", tab === t ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground")}
              >
                {t === "live" ? "Live" : "Recent drives"}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {tab === "live" ? (
            (live ?? []).length === 0 ? (
              <EmptyState title="Nobody is driving" body="Drivers appear here while Track mode is on in their app." />
            ) : (
              <ul className="space-y-1.5">
                {live!.map((d) => (
                  <li key={d.userId}>
                    <div className={cn("rounded-lg border p-3", selected === d.userId ? "border-primary bg-primary-soft" : "border-border bg-surface-2")}>
                      <button type="button" onClick={() => setSelected(d.userId)} className="block w-full text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{d.displayName}</span>
                          <Badge tone="success">Live</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted">{formatSpeed(d.speedMps, unit)} · {formatAgo(d.updatedAt)}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/focus/${d.userId}`)}
                        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted hover:text-foreground"
                      >
                        <CubeIcon width={14} height={14} /> 3D focus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (recent ?? []).length === 0 ? (
            <EmptyState title="No drives yet" body="Completed drives from your drivers show up here." />
          ) : (
            <ul className="space-y-1.5">
              {recent!.map((d) => (
                <li key={d.id}>
                  <div className={cn("rounded-lg border p-3", routeId === d.id ? "border-primary bg-primary-soft" : "border-border bg-surface-2")}>
                    <button type="button" onClick={() => setRouteId(routeId === d.id ? null : d.id)} className="block w-full text-left" aria-pressed={routeId === d.id}>
                      <div className="truncate text-sm font-medium">{names.get(d.userId) ?? "Driver"}</div>
                      <div className="mt-1 text-xs text-muted">{formatDateTime(d.startedAt)} · {formatDistance(d.distanceM, unit)}</div>
                    </button>
                    <Link href={`/fleets/${active.id}/drives/${d.id}`} className="mt-2 inline-block text-xs text-primary hover:underline">Open replay</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <FleetMap
        className="min-h-0 flex-1"
        drivers={live ?? []}
        selectedId={selected}
        onSelectDriver={setSelected}
        route={tab === "recent" && routeDrive ? { path: routeDrive.path, jolts: routeDrive.jolts } : null}
        fitRoute
      />
    </div>
  );
}
