"use client";

import { Badge, Card, CardHeader, PageHeader, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { CESIUM_ION_TOKEN, DEMO_MODE, hasMapbox } from "@/lib/config";
import type { DistanceUnit } from "@/lib/format";
import { useUnit } from "@/lib/use-unit";

export function SettingsView() {
  const { user } = useAuth();
  const [unit, setUnit] = useUnit();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader title="Units" description="How distances and speeds are shown across the console." />
          <div role="radiogroup" aria-label="Distance unit" className="flex gap-2 p-4">
            {(["km", "mi"] as DistanceUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                onClick={() => setUnit(u)}
                className={cn("h-9 rounded-lg border px-4 text-sm font-medium", unit === u ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground")}
              >
                {u === "km" ? "Kilometres" : "Miles"}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Account" />
          <dl className="space-y-2 p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Signed in as</dt><dd>{user?.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Data</dt><dd>{DEMO_MODE ? <Badge tone="primary">Built-in demo data</Badge> : <Badge tone="success">Live database</Badge>}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Map & 3D" description="Configured at build time with environment variables." />
          <dl className="space-y-2 p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Mapbox token</dt><dd>{hasMapbox ? <Badge tone="success">Set</Badge> : <Badge tone="warning">Missing</Badge>}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Cesium ion token (terrain + buildings)</dt><dd>{CESIUM_ION_TOKEN ? <Badge tone="success">Set</Badge> : <Badge>Optional</Badge>}</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
