"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useFleets } from "@/components/layout/FleetProvider";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { repo } from "@/lib/data";
import { formatDate } from "@/lib/format";

export function FleetsList() {
  const { fleets, loading, error, reload, setActiveId } = useFleets();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setFormError("Give the fleet a name of at least 2 characters.");
    setBusy(true);
    setFormError(null);
    try {
      const fleet = await repo.createFleet(name);
      setActiveId(fleet.id);
      setName("");
      setCreating(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the fleet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Fleets"
        description="A fleet is a group of drivers. Share its join code and they connect from the MileWire app."
        actions={
          <Button onClick={() => setCreating((v) => !v)}>
            <PlusIcon /> New fleet
          </Button>
        }
      />

      {creating ? (
        <Card className="mb-6 p-4">
          <form onSubmit={create} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <Field label="Fleet name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Couriers" maxLength={60} autoFocus />
              </Field>
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create fleet"}</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </form>
          {formError ? <div className="mt-3"><ErrorNote message={formError} /></div> : null}
        </Card>
      ) : null}

      {error ? <ErrorNote message={error} /> : null}
      {loading && fleets.length === 0 ? <Spinner label="Loading fleets" /> : null}

      {!loading && fleets.length === 0 && !error ? (
        <Card>
          <EmptyState title="No fleets yet" body="Create your first fleet, then give its join code to your drivers." />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fleets.map((f) => (
            <li key={f.id}>
              <Link href={`/fleets/${f.id}`} className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/60">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate text-base font-semibold">{f.name}</h2>
                  <Badge tone="primary">{f.joinCode}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted">Created {formatDate(f.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
