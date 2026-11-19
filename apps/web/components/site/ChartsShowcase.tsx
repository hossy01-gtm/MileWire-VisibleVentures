import type { ReactNode } from "react";
import { DailyBars, MotionChart, SpeedChart } from "@/features/fleets/charts";
import { bumpsPerUnit, formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import { summarizeMotion } from "@/lib/motion";
import { sampleDaily, sampleDrive, sampleDriverName, sampleFleetName } from "./sample-drive";

/**
 * The console's own speed, motion and distance charts, drawn from a real
 * recorded drive and the demo fleet's daily distances (see sample-drive.ts), so
 * the landing page shows exactly what a manager sees rather than a mock-up.
 */

function Card({ eyebrow, title, className = "", children }: { eyebrow: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col border border-border bg-background ${className}`}>
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3">
        <p className="eyebrow">{eyebrow}</p>
        <p className="truncate text-sm text-muted">{title}</p>
      </div>
      <div className="flex flex-1 flex-col justify-center p-5">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="mono mt-2 text-2xl text-foreground">{value}</p>
    </div>
  );
}

export function ChartsShowcase() {
  const drive = sampleDrive();
  const driver = sampleDriverName;
  const motion = summarizeMotion(drive.motion);
  const daily = sampleDaily();
  const dateLabel = new Date(drive.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const t0 = drive.path[0][2];
  const cursorMs = drive.durationMs * 0.42;

  return (
    <div className="grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 lg:col-span-3">
        <Stat label="Distance" value={formatDistance(drive.distanceM)} />
        <Stat label="Drive time" value={formatDuration(drive.durationMs)} />
        <Stat label="Top speed" value={formatSpeed(drive.maxSpeedMps)} />
        <Stat label="Bumps / km" value={bumpsPerUnit(drive.joltCount, drive.distanceM)?.toFixed(1) ?? "–"} />
      </div>

      <Card eyebrow="Speed" title={`${driver} · ${dateLabel}`} className="lg:col-span-2">
        <SpeedChart path={drive.path} jolts={drive.jolts} cursorMs={cursorMs} unit="km" className="h-40 md:h-52" />
      </Card>
      <Card eyebrow="Distance per day" title={`${sampleFleetName} · Nov 1–16`}>
        <DailyBars data={daily} unit="km" className="h-40 md:h-52" />
      </Card>

      <Card eyebrow="Motion (IMU)" title={`Peak ${motion.peakAccelG.toFixed(2)} g`} className="lg:col-span-3">
        <MotionChart motion={drive.motion} cursorAt={t0 + cursorMs} className="h-36 md:h-44" />
      </Card>
    </div>
  );
}
