"use client";

import { useMemo, useState } from "react";
import { DownloadIcon, PlusIcon, PrinterIcon } from "@/components/icons";
import { Button, Card, CardHeader, EmptyState, ErrorNote, Field, Input, Select, Spinner, Stat, Table, Td, Th } from "@/components/ui";
import { repo } from "@/lib/data";
import { endOfLocalDay, formatDateTime, formatDistance, formatDuration, formatKm, kmToUnit, startOfLocalDay, toDateInput, type DistanceUnit } from "@/lib/format";
import { buildMileageReport, mileageCsv, unassignedDrives } from "@/lib/mileage";
import type { Member, Vehicle } from "@/lib/types";
import { useAsyncData } from "@/lib/use-async-data";
import { useUnit } from "@/lib/use-unit";

type Props = { fleetId: string; fleetName: string; members: Member[] };

type FormState = { id: string | null; label: string; plate: string; odometer: string };
const EMPTY_FORM: FormState = { id: null, label: "", plate: "", odometer: "0" };

/**
 * Vehicles, who is driving each, and a mileage report per vehicle.
 * Distance is attributed from completed drives that overlap a driver's
 * assignment window, so reports are only as good as the assignment history.
 */
export function MileageSection({ fleetId, fleetName, members }: Props) {
  const [unit] = useUnit();
  const [form, setForm] = useState<FormState | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error: loadError, refresh } = useAsyncData(async () => {
    const [vehicles, assignments] = await Promise.all([repo.listVehicles(fleetId), repo.listAssignments(fleetId)]);
    // Drives since the oldest baseline decide every vehicle's odometer.
    const since = vehicles.length ? Math.min(...vehicles.map((v) => v.baselineEffectiveAt)) : Date.now();
    const drives = vehicles.length ? await repo.listDrives({ fleetId, from: since, limit: 1000 }) : [];
    return { vehicles, assignments, drives };
  }, [fleetId]);

  const names = useMemo(() => new Map(members.map((m) => [m.userId, m.displayName])), [members]);
  const nameOf = (id: string) => names.get(id) ?? "Former driver";
  const vehicles = data?.vehicles ?? [];
  const currentByVehicle = useMemo(() => new Map((data?.assignments ?? []).filter((a) => a.unassignedAt == null).map((a) => [a.vehicleId, a.userId])), [data]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const label = form.label.trim();
    const entered = Number(form.odometer);
    if (!label) return setError("Give the vehicle a label.");
    if (!Number.isFinite(entered) || entered < 0) return setError("Odometer must be a number, 0 or more.");
    const baselineOdometerKm = unit === "mi" ? entered * 1.609344 : entered;
    const existing = form.id ? vehicles.find((v) => v.id === form.id) : null;
    if (existing && Math.abs(existing.baselineOdometerKm - baselineOdometerKm) > 0.05 && !window.confirm("Changing the baseline odometer also changes every past report for this vehicle. Continue?")) return;
    await run(async () => {
      const input = { label, licensePlate: form.plate.trim() || null, baselineOdometerKm };
      if (form.id) await repo.updateVehicle(form.id, input);
      else await repo.createVehicle(fleetId, input);
      setForm(null);
    });
  }

  async function assign(vehicle: Vehicle, userId: string) {
    await run(() => (userId ? repo.assignVehicle(fleetId, vehicle.id, userId) : repo.unassignVehicle(vehicle.id)));
  }

  async function remove(vehicle: Vehicle) {
    if (!window.confirm(`Delete ${vehicle.label}? Its assignment history is removed too.`)) return;
    if (reportId === vehicle.id) setReportId(null);
    await run(() => repo.deleteVehicle(vehicle.id));
  }

  const reportVehicle = vehicles.find((v) => v.id === reportId) ?? null;

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardHeader
          title="Vehicles & mileage"
          description="Assign a driver to a vehicle and distance from their completed drives counts toward its odometer."
          action={
            <Button variant="secondary" onClick={() => { setError(null); setForm(EMPTY_FORM); }}>
              <PlusIcon /> Add vehicle
            </Button>
          }
        />

        {form ? (
          <form onSubmit={save} className="grid gap-3 border-b border-border p-4 sm:grid-cols-4 sm:items-end">
            <Field label="Label"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Van 12" maxLength={60} autoFocus /></Field>
            <Field label="Licence plate (optional)"><Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} maxLength={16} /></Field>
            <Field label={`Starting odometer (${unit})`} hint="Counted from today on.">
              <Input type="number" inputMode="decimal" min={0} step="0.1" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>{form.id ? "Save" : "Add"}</Button>
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            </div>
          </form>
        ) : null}

        {error || loadError ? <div className="p-4"><ErrorNote message={(error ?? loadError)!} /></div> : null}

        {loading && !data ? (
          <div className="p-4"><Spinner label="Loading vehicles" /></div>
        ) : vehicles.length === 0 ? (
          <EmptyState title="No vehicles yet" body="Add a vehicle to start tracking its mileage." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Vehicle</Th><Th>Baseline odometer</Th><Th>Driver</Th><Th /></tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <Td>
                    <div className="font-medium">{v.label}</div>
                    {v.licensePlate ? <div className="text-xs text-muted">{v.licensePlate}</div> : null}
                  </Td>
                  <Td>{formatKm(v.baselineOdometerKm, unit)}</Td>
                  <Td>
                    <Select
                      aria-label={`Driver for ${v.label}`}
                      value={currentByVehicle.get(v.id) ?? ""}
                      disabled={busy}
                      onChange={(e) => void assign(v, e.target.value)}
                      className="max-w-48"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                    </Select>
                  </Td>
                  <Td className="space-x-1 text-right whitespace-nowrap">
                    <Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => setReportId(v.id)}>Report</Button>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setError(null); setForm({ id: v.id, label: v.label, plate: v.licensePlate ?? "", odometer: String(Number(kmToUnit(v.baselineOdometerKm, unit).toFixed(1))) }); }}>Edit</Button>
                    <Button variant="ghost" className="h-7 px-2 text-xs text-danger" onClick={() => void remove(v)}>Delete</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {reportVehicle && data ? (
        <ReportPanel
          fleetName={fleetName}
          vehicle={reportVehicle}
          assignments={data.assignments}
          drives={data.drives}
          nameOf={nameOf}
          unit={unit}
          onClose={() => setReportId(null)}
        />
      ) : null}
    </div>
  );
}

function ReportPanel({
  fleetName,
  vehicle,
  assignments,
  drives,
  nameOf,
  unit,
  onClose,
}: {
  fleetName: string;
  vehicle: Vehicle;
  assignments: Parameters<typeof buildMileageReport>[0]["assignments"];
  drives: Parameters<typeof buildMileageReport>[0]["drives"];
  nameOf: (userId: string) => string;
  unit: DistanceUnit;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(() => toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()));
  const [to, setTo] = useState(() => toDateInput(Date.now()));
  const fromMs = startOfLocalDay(from);
  const toMs = endOfLocalDay(to);
  const [generatedAt] = useState(() => Date.now());
  const valid = from !== "" && to !== "" && fromMs <= toMs;

  const report = useMemo(() => (valid ? buildMileageReport({ vehicle, assignments, drives, from: fromMs, to: toMs }) : null), [valid, vehicle, assignments, drives, fromMs, toMs]);
  const orphaned = useMemo(() => unassignedDrives(assignments, drives).filter((d) => d.startedAt >= fromMs && d.startedAt <= toMs), [assignments, drives, fromMs, toMs]);
  const orphanedM = orphaned.reduce((s, d) => s + d.distanceM, 0);

  function downloadCsv() {
    if (!report) return;
    const divisor = unit === "mi" ? 1609.344 : 1000;
    const blob = new Blob([mileageCsv(report, nameOf, divisor, unit)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mileage-${vehicle.label.replace(/\W+/g, "-").toLowerCase()}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader
        title={`Mileage report — ${vehicle.label}`}
        description={`${fleetName}${vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}`}
        action={
          <div className="no-print flex gap-2">
            <Button variant="secondary" onClick={downloadCsv} disabled={!report}><DownloadIcon /> CSV</Button>
            <Button variant="secondary" onClick={() => window.print()} disabled={!report}><PrinterIcon /> Print / PDF</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        }
      />
      <div className="no-print grid gap-3 border-b border-border p-4 sm:grid-cols-4 sm:items-end">
        <Field label="From"><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      {!report ? (
        <div className="p-4"><ErrorNote message="Choose a valid date range." /></div>
      ) : (
        <div className="space-y-5 p-4">
          <p className="hidden text-sm print:block">
            Period {from} to {to} · generated {formatDateTime(generatedAt)}. Distance is attributed from completed drives of the assigned driver.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Odometer at start" value={formatKm(report.openingOdometerKm, unit)} />
            <Stat label="Distance in period" value={formatDistance(report.rangeDistanceM, unit)} sub={`${report.drives.length} drive${report.drives.length === 1 ? "" : "s"}`} />
            <Stat label="Odometer at end" value={formatKm(report.closingOdometerKm, unit)} />
          </div>

          {orphaned.length > 0 ? (
            <p className="no-print rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              {orphaned.length} drive{orphaned.length === 1 ? "" : "s"} ({formatDistance(orphanedM, unit)}) in this fleet aren&apos;t counted toward any vehicle because no driver was assigned at the time.
            </p>
          ) : null}

          {report.drives.length === 0 ? (
            <EmptyState title="No attributed drives in this period" body="Totals are zero because no assigned driver recorded a drive in this range." />
          ) : (
            <>
              <Table>
                <thead><tr><Th>Driver</Th><Th>Drives</Th><Th>Distance</Th></tr></thead>
                <tbody>
                  {report.byDriver.map((d) => (
                    <tr key={d.userId}><Td>{nameOf(d.userId)}</Td><Td>{d.drives}</Td><Td>{formatDistance(d.distanceM, unit)}</Td></tr>
                  ))}
                </tbody>
              </Table>
              <Table>
                <thead><tr><Th>Date</Th><Th>Driver</Th><Th>Distance</Th><Th>Duration</Th></tr></thead>
                <tbody>
                  {report.drives.map(({ drive }) => (
                    <tr key={drive.id}>
                      <Td>{formatDateTime(drive.startedAt)}</Td>
                      <Td>{nameOf(drive.userId)}</Td>
                      <Td>{formatDistance(drive.distanceM, unit)}</Td>
                      <Td>{formatDuration(drive.durationMs)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
