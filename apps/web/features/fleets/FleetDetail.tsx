"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeftIcon, CopyIcon } from "@/components/icons";
import { useFleets } from "@/components/layout/FleetProvider";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorNote, PageHeader, Spinner, Stat, Table, Td, Th, cn } from "@/components/ui";
import { repo } from "@/lib/data";
import { bumpsPerUnit, formatDateTime, formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import { byDay, byDriver, totalsOf } from "@/lib/metrics";
import { useAsyncData } from "@/lib/use-async-data";
import { useUnit } from "@/lib/use-unit";
import { DailyBars } from "./charts";
import { MileageSection } from "./MileageSection";

const RANGES = [7, 30, 90] as const;
const DAY = 86_400_000;

export function FleetDetail() {
  const { fleetId } = useParams<{ fleetId: string }>();
  const router = useRouter();
  const { fleets, loading: fleetsLoading, reload } = useFleets();
  const [unit] = useUnit();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [now] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fleet = fleets.find((f) => f.id === fleetId);
  const from = now - days * DAY;

  const { data: members, refresh: refreshMembers } = useAsyncData(() => repo.listMembers(fleetId), [fleetId]);
  const { data: live } = useAsyncData(() => repo.listLive(fleetId), [fleetId], 5000);
  const { data: drives, loading: drivesLoading, error: drivesError } = useAsyncData(() => repo.listDrives({ fleetId, from, to: now, limit: 1000 }), [fleetId, days]);

  const names = useMemo(() => new Map((members ?? []).map((m) => [m.userId, m.displayName])), [members]);
  const liveIds = useMemo(() => new Set((live ?? []).map((d) => d.userId)), [live]);
  const totals = useMemo(() => totalsOf(drives ?? []), [drives]);
  const perDriver = useMemo(() => byDriver(drives ?? []), [drives]);
  const daily = useMemo(() => byDay(drives ?? [], from, now), [drives, from, now]);

  if (fleetsLoading && !fleet) return <Spinner label="Loading fleet" />;
  if (!fleet) {
    return (
      <>
        <BackLink />
        <EmptyState title="Fleet not found" body="It may have been deleted, or you may not have access." />
      </>
    );
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(fleet!.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setActionError("Could not copy — select the code and copy it manually.");
    }
  }

  async function removeMember(userId: string) {
    if (!window.confirm(`Remove ${names.get(userId) ?? "this driver"} from the fleet? Their past drives stay in the fleet's history.`)) return;
    try {
      await repo.removeMember(fleetId, userId);
      refreshMembers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove the driver.");
    }
  }

  async function deleteFleet() {
    if (!window.confirm(`Delete "${fleet!.name}"? Drivers will be disconnected and its vehicles and assignments removed. This cannot be undone.`)) return;
    try {
      await repo.deleteFleet(fleetId);
      reload();
      router.replace("/fleets");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not delete the fleet.");
    }
  }

  const driverRows = (members ?? []).map((m) => ({ member: m, t: perDriver.find((d) => d.userId === m.userId) }));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          back={<BackLink />}
          title={fleet.name}
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              Join code
              <button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 font-mono text-sm font-semibold text-primary hover:bg-primary/25" aria-label="Copy join code">
                {fleet.joinCode} <CopyIcon width={14} height={14} />
              </button>
              {copied ? <span className="text-xs text-success" role="status">Copied</span> : null}
            </span>
          }
          actions={<Button variant="danger" onClick={deleteFleet}>Delete fleet</Button>}
        />
        {actionError ? <ErrorNote message={actionError} /> : null}
      </div>

      <div className="no-print space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Activity</h2>
          <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={days === r}
                onClick={() => setDays(r)}
                className={cn("h-8 rounded-md px-3 text-xs font-medium", days === r ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground")}
              >
                {r} days
              </button>
            ))}
          </div>
        </div>

        {drivesError ? <ErrorNote message={drivesError} /> : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Drives" value={drivesLoading && !drives ? "…" : totals.drives} />
          <Stat label="Distance" value={formatDistance(totals.distanceM, unit)} />
          <Stat label="Time driving" value={formatDuration(totals.durationMs)} />
          <Stat label="Top speed" value={formatSpeed(totals.maxSpeedMps, unit)} />
          <Stat label={`Bumps / ${unit}`} value={bumpsPerUnit(totals.joltCount, totals.distanceM, unit)?.toFixed(1) ?? "–"} sub={`${totals.joltCount} total`} />
        </div>
        {(drives?.length ?? 0) >= 1000 ? <p className="text-xs text-warning">Showing the latest 1,000 drives — totals may be incomplete for this range.</p> : null}

        <Card>
          <CardHeader title="Distance per day" />
          <div className="p-4"><DailyBars data={daily} unit={unit} /></div>
        </Card>

        <Card>
          <CardHeader title="Drivers" description={`${members?.length ?? 0} in this fleet`} />
          {driverRows.length === 0 ? (
            <EmptyState title="No drivers yet" body={`Ask drivers to open MileWire → Settings → Join a fleet and enter ${fleet.joinCode}.`} />
          ) : (
            <Table>
              <thead>
                <tr><Th>Driver</Th><Th>Drives</Th><Th>Distance</Th><Th>Time</Th><Th>Bumps / {unit}</Th><Th /></tr>
              </thead>
              <tbody>
                {driverRows.map(({ member, t }) => (
                  <tr key={member.userId}>
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        {member.displayName}
                        {liveIds.has(member.userId) ? <Link href={`/focus/${member.userId}`}><Badge tone="success">Live · 3D</Badge></Link> : null}
                      </span>
                    </Td>
                    <Td>{t?.drives ?? 0}</Td>
                    <Td>{formatDistance(t?.distanceM ?? 0, unit)}</Td>
                    <Td>{formatDuration(t?.durationMs ?? 0)}</Td>
                    <Td>{t ? (bumpsPerUnit(t.joltCount, t.distanceM, unit)?.toFixed(1) ?? "–") : "–"}</Td>
                    <Td className="text-right"><Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeMember(member.userId)}>Remove</Button></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent drives" description="Open one to replay it on the map or in 3D." />
          {(drives ?? []).length === 0 ? (
            <EmptyState title="No drives in this range" body="Completed drives from your drivers appear here." />
          ) : (
            <Table>
              <thead>
                <tr><Th>When</Th><Th>Driver</Th><Th>Distance</Th><Th>Time</Th><Th>Top speed</Th><Th>Bumps</Th><Th /></tr>
              </thead>
              <tbody>
                {drives!.slice(0, 15).map((d) => (
                  <tr key={d.id}>
                    <Td>{formatDateTime(d.startedAt)}</Td>
                    <Td>{names.get(d.userId) ?? "Driver"}</Td>
                    <Td>{formatDistance(d.distanceM, unit)}</Td>
                    <Td>{formatDuration(d.durationMs)}</Td>
                    <Td>{formatSpeed(d.maxSpeedMps, unit)}</Td>
                    <Td>{d.joltCount}</Td>
                    <Td className="text-right"><Link className="text-primary hover:underline" href={`/fleets/${fleetId}/drives/${d.id}`}>Replay</Link></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <MileageSection fleetId={fleetId} fleetName={fleet.name} members={members ?? []} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/fleets" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
      <ChevronLeftIcon /> All fleets
    </Link>
  );
}
