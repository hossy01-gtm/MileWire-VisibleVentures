"use client";

import { formatClock, formatDistance, formatSpeed, type DistanceUnit } from "@/lib/format";
import { BUMP_THRESHOLD_G } from "@/lib/motion";
import type { JoltMark, MotionPoint, PathPoint } from "@/lib/types";

const SEVERITY = { low: "#e0a030", medium: "#e8742b", high: "#e5584f" } as const;

/** Speed over the drive, with bump ticks and a cursor for the replay position. */
export function SpeedChart({ path, jolts, cursorMs, unit, className = "h-28" }: { path: PathPoint[]; jolts: JoltMark[]; cursorMs?: number; unit: DistanceUnit; className?: string }) {
  if (path.length < 2) return null;
  const W = 800, H = 120, PAD = 4;
  const t0 = path[0][2];
  const span = Math.max(1, path[path.length - 1][2] - t0);
  const top = Math.max(5, ...path.map((p) => p[3]));
  const x = (t: number) => PAD + ((t - t0) / span) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / top) * (H - PAD * 2);
  const line = path.map((p, i) => `${i === 0 ? "M" : "L"}${x(p[2]).toFixed(1)},${y(p[3]).toFixed(1)}`).join(" ");
  const area = `${line} L${x(path[path.length - 1][2]).toFixed(1)},${H - PAD} L${x(t0).toFixed(1)},${H - PAD} Z`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className={`${className} w-full`} role="img" aria-label={`Speed over time, peak ${formatSpeed(top, unit)}`} preserveAspectRatio="none">
        <path d={area} fill="#cd7f32" opacity="0.15" />
        <path d={line} fill="none" stroke="#cd7f32" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {jolts.map((j, i) => (
          <line key={i} x1={x(j.t)} x2={x(j.t)} y1={H - PAD} y2={H - PAD - 14} stroke={SEVERITY[j.severity]} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        ))}
        {cursorMs != null ? <line x1={x(t0 + cursorMs)} x2={x(t0 + cursorMs)} y1="0" y2={H} stroke="#f3ede6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-subtle">
        <span>0:00</span>
        <span>Peak {formatSpeed(top, unit)}</span>
        <span>{formatClock(span)}</span>
      </figcaption>
    </figure>
  );
}

/** Distance per day as bars. */
export function DailyBars({ data, unit, className = "h-36" }: { data: Array<{ day: string; distanceM: number; drives: number }>; unit: DistanceUnit; className?: string }) {
  const W = 800, H = 140, PAD = 6;
  const top = Math.max(1, ...data.map((d) => d.distanceM));
  const bw = (W - PAD * 2) / Math.max(1, data.length);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className={`${className} w-full`} role="img" aria-label="Distance driven per day" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.distanceM / top) * (H - PAD * 2);
          return (
            <rect key={d.day} x={PAD + i * bw + 1} y={H - PAD - h} width={Math.max(1, bw - 2)} height={Math.max(d.distanceM > 0 ? 2 : 0, h)} rx="2" fill="#cd7f32" opacity={d.distanceM > 0 ? 0.9 : 0.2}>
              <title>{`${d.day}: ${formatDistance(d.distanceM, unit)} in ${d.drives} drive${d.drives === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-subtle">
        <span>{data[0]?.day}</span>
        <span>Peak day {formatDistance(top, unit)}</span>
        <span>{data[data.length - 1]?.day}</span>
      </figcaption>
    </figure>
  );
}

const GYRO = "#7fb7d6";

/**
 * Motion-sensor series for a drive: peak acceleration deviation from 1 g (left
 * scale, bronze) and peak rotation rate (right scale, blue), with the bump
 * threshold marked and a cursor for the replay position.
 */
export function MotionChart({ motion, cursorAt, className = "h-36" }: { motion: MotionPoint[]; cursorAt?: number; className?: string }) {
  if (motion.length < 2) return null;
  const W = 800, H = 140, PAD = 4;
  const t0 = motion[0][0];
  const span = Math.max(1, motion[motion.length - 1][0] - t0);
  const accelTop = Math.max(0.6, ...motion.map((m) => m[1]));
  const gyroTop = Math.max(1, ...motion.map((m) => m[2]));
  const x = (t: number) => PAD + ((t - t0) / span) * (W - PAD * 2);
  const yAccel = (v: number) => H - PAD - (v / accelTop) * (H - PAD * 2);
  const yGyro = (v: number) => H - PAD - (v / gyroTop) * (H - PAD * 2);
  const line = (pick: (m: MotionPoint) => number, y: (v: number) => number) => motion.map((m, i) => `${i === 0 ? "M" : "L"}${x(m[0]).toFixed(1)},${y(pick(m)).toFixed(1)}`).join(" ");
  const inRange = cursorAt != null && cursorAt >= t0 && cursorAt <= t0 + span;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className={`${className} w-full`} role="img" aria-label={`Motion sensor readings, peak ${accelTop.toFixed(2)} g`} preserveAspectRatio="none">
        <line x1={PAD} x2={W - PAD} y1={yAccel(BUMP_THRESHOLD_G)} y2={yAccel(BUMP_THRESHOLD_G)} stroke="#6f675e" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={line((m) => m[2], yGyro)} fill="none" stroke={GYRO} strokeWidth="1.5" opacity="0.8" vectorEffect="non-scaling-stroke" />
        <path d={line((m) => m[1], yAccel)} fill="none" stroke="#cd7f32" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {inRange ? <line x1={x(cursorAt)} x2={x(cursorAt)} y1="0" y2={H} stroke="#f3ede6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <figcaption className="mt-1 flex flex-wrap items-center justify-between gap-x-4 text-xs text-subtle">
        <span><span className="text-primary">■</span> Acceleration, peak deviation from 1 g (0–{accelTop.toFixed(1)} g)</span>
        <span><span style={{ color: GYRO }}>■</span> Rotation, peak rad/s (0–{gyroTop.toFixed(0)})</span>
        <span>Dashed line: bump level ({BUMP_THRESHOLD_G} g)</span>
      </figcaption>
    </figure>
  );
}
