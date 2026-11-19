"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/icons";
import { cn } from "@/components/ui";
import { formatClock } from "@/lib/format";
import { usesLookAt, type CameraCommandKind, type CameraMode } from "./camera";
import { nextReplaySpeed, type ReplaySpeed } from "./useReplayClock";

/*
 * Shared chrome for the full-bleed focus and replay views:
 *
 *   ┌ header: back · title ───────────── layers · camera · orientation ┐
 *   ├ transport (replay only): exit · play · scrub ──── time · speed ──┤
 *   ├ stage ─────────────────────────────────────┬ dossier ───────────┤
 *   │ 3D view / map                              │ readouts + charts  │
 *   └────────────────────────────────────────────┴────────────────────┘
 */

type ToolTone = "ghost" | "secondary" | "active" | "pressed";
const toneClass: Record<ToolTone, string> = {
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
  secondary: "border border-border bg-surface-3 text-foreground hover:bg-border",
  active: "bg-primary text-primary-foreground",
  pressed: "bg-primary-soft text-primary",
};

export function ToolButton({ tone = "ghost", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ToolTone }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        toneClass[tone],
        className,
      )}
    />
  );
}

/** A bordered cluster of tool buttons. */
export function ToolGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-background/95 p-1", className)} />;
}

export function FocusLayout({ header, transport, stage, dossier }: { header: ReactNode; transport?: ReactNode; stage: ReactNode; dossier: ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {header}
      {transport}
      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-64 min-w-0 flex-1 overflow-hidden bg-surface/40">{stage}</div>
        {dossier}
      </div>
    </div>
  );
}

export function FocusHeader({ backHref, backLabel, eyebrow, title, children }: { backHref: string; backLabel: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-background/95 px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={backHref} className="inline-flex shrink-0 items-center gap-1 text-[13px] text-primary underline-offset-4 hover:underline">
          <ChevronLeftIcon width={14} height={14} /> {backLabel}
        </Link>
        <div className="min-w-0">
          <p className="eyebrow mb-0">{eyebrow}</p>
          <p className="mono truncate text-xs">{title}</p>
        </div>
      </div>
      {children ? <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div> : null}
    </header>
  );
}

/** Independent on/off switches for what the 3D view draws. */
export function LayerToggles({ layers, disabled }: { layers: Array<{ id: string; label: string; on: boolean; onChange: (on: boolean) => void }>; disabled?: boolean }) {
  return (
    <ToolGroup role="toolbar" aria-label="Layers">
      {layers.map((l) => (
        <ToolButton key={l.id} tone={l.on ? "pressed" : "ghost"} aria-pressed={l.on} aria-label={`${l.label} layer${l.on ? ", shown" : ", hidden"}`} disabled={disabled} onClick={() => l.onChange(!l.on)}>
          {l.label}
        </ToolButton>
      ))}
    </ToolGroup>
  );
}

/** Recage / tilt / north-up. Tilt and north apply to the orbit and chase cameras. */
export function CameraOrientationBar({ mode, onCommand }: { mode: CameraMode; onCommand: (kind: CameraCommandKind) => void }) {
  const lookAt = usesLookAt(mode);
  return (
    <ToolGroup role="toolbar" aria-label="Camera orientation">
      <ToolButton aria-label="Recentre the camera on the vehicle" onClick={() => onCommand("recage")}>Recage</ToolButton>
      <ToolButton aria-label="Toggle a steeper look-down" disabled={!lookAt} onClick={() => onCommand("tilt")}>Tilt</ToolButton>
      <ToolButton aria-label="Face north" disabled={!lookAt} onClick={() => onCommand("north")}>N</ToolButton>
    </ToolGroup>
  );
}

type TransportProps = {
  t: number;
  durationMs: number;
  playing: boolean;
  speed: ReplaySpeed;
  onPlayPause: () => void;
  onScrub: (ms: number) => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onExit: () => void;
};

/** Exit · play / pause · scrubber · clock · speed. */
export function ReplayTransport({ t, durationMs, playing, speed, onPlayPause, onScrub, onSpeedChange, onExit }: TransportProps) {
  return (
    <div role="group" aria-label="Drive replay" className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border bg-background/95 px-3 py-1.5">
      <ToolButton onClick={onExit}>Exit replay</ToolButton>
      <ToolButton aria-pressed={playing} aria-label={playing ? "Pause replay" : "Play replay"} onClick={onPlayPause}>
        {playing ? "Pause" : "Play"}
      </ToolButton>
      <div className="flex min-w-48 flex-1 items-center gap-2">
        <label htmlFor="replay-scrubber" className="eyebrow shrink-0">Scrub</label>
        <input
          id="replay-scrubber"
          type="range"
          min={0}
          max={Math.max(1, durationMs)}
          step={500}
          value={t}
          aria-valuetext={`${formatClock(t)} of ${formatClock(durationMs)}`}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="h-7 min-w-0 flex-1 accent-primary"
        />
      </div>
      <time className="mono text-[11px] text-muted">{formatClock(t)} / {formatClock(durationMs)}</time>
      <ToolButton tone="secondary" aria-label={`Replay speed ${speed}×, press to change`} onClick={() => onSpeedChange(nextReplaySpeed(speed))}>
        {speed}×
      </ToolButton>
    </div>
  );
}

/** Right-hand panel: a titled header, then scrolling readouts. Sits under the stage on narrow screens. */
export function Dossier({ label, eyebrow, title, intro, children }: { label: string; eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="flex max-h-[45%] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-border bg-background/95 md:max-h-none md:w-84 md:border-l md:border-t-0">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <p className="eyebrow mb-0.5">{eyebrow}</p>
        <p className="text-[13px] font-medium leading-snug tracking-tight">{title}</p>
        {intro ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{intro}</p> : null}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">{children}</div>
    </aside>
  );
}

export function DossierSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow mb-1">{label}</h2>
      {children}
    </section>
  );
}

/** "Label value" lines, value in mono. */
export function Readouts({ rows }: { rows: Array<[label: string, value: ReactNode]> }) {
  return (
    <ul className="space-y-0.5 text-xs leading-relaxed text-muted">
      {rows.map(([label, value]) => (
        <li key={label}>
          {label} <span className="mono text-foreground">{value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Gesture hint in the corner of the 3D stage. Sits above the map credits. */
export function StageHint({ mode }: { mode: CameraMode }) {
  const text =
    mode === "fpv"
      ? "In-car — follows the vehicle's heading"
      : `${mode === "chase" ? "Chase" : "Orbit"} — drag to orbit · scroll to zoom · right-drag to tilt · Recage to reset`;
  return (
    <div role="note" className="pointer-events-none absolute bottom-10 left-3 z-10 max-w-xs rounded-md border border-border bg-background/90 px-3 py-2 text-[11px] leading-snug text-muted shadow-sm">
      {text}
    </div>
  );
}
