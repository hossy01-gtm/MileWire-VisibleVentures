import type { ReactNode } from "react";
import { DailyBars, MotionChart, SpeedChart } from "@/features/fleets/charts";
import { buildDemoDrives, DEMO_MEMBERS, DEMO_RANGE } from "@/lib/data/demoData";
import { bumpsPerUnit, formatDistance, formatDuration, formatSpeed } from "@/lib/format";
import { summarizeMotion } from "@/lib/motion";
import { sampleDrive } from "./sample-drive";

/**
 * The console's own speed, motion and distance charts, drawn from the sample
 * fleet's recorded history (the same data the demo console uses), so the
 * landing page shows exactly what a manager sees rather than a mock-up.
 */

const DAY_MS = 86_400_000;

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
  const drives = buildDemoDrives();
  const drive = sampleDrive();
  const driver = DEMO_MEMBERS.find((m) => m.userId === drive.userId)?.displayName ?? "Driver";
  const motion = summarizeMotion(drive.motion);

  // Whole-fleet distance per day across the sample range (UTC days; every sample drive starts mid-day UTC).
  const daily = Array.from({ length: DEMO_RANGE.days }, (_, i) => {
    const start = DEMO_RANGE.startDay + i * DAY_MS;
    const day = drives.filter((d) => d.startedAt >= start && d.startedAt < start + DAY_MS);
    return {
      day: new Date(start).toISOString().slice(0, 10),
      distanceM: day.reduce((sum, d) => sum + d.distanceM, 0),
      drives: day.length,
    };
  });
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
      <Card eyebrow="Distance per day" title="Sample fleet · Nov 1–16">
        <DailyBars data={daily} unit="km" className="h-40 md:h-52" />
      </Card>

      <Card eyebrow="Motion (IMU)" title={`Peak ${motion.peakAccelG.toFixed(2)} g`} className="lg:col-span-3">
        <MotionChart motion={drive.motion} cursorAt={t0 + cursorMs} className="h-36 md:h-44" />
      </Card>
    </div>
  );
}
