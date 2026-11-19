"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Hero visual: a stylised route map with vehicles moving along bronze routes
 * and floating status pills, cycling through the three things MileWire does
 * (live map, drive replay, mileage). Purely illustrative; no real data.
 */

type RouteId = "a" | "b" | "c";
type PhaseId = "live" | "replay" | "mileage";

const ROUTES: Record<RouteId, { d: string; rest: [number, number]; dur: number }> = {
  a: { d: "M60 430 C 140 380, 180 300, 260 280 S 400 230, 470 150 S 560 90, 600 60", rest: [260, 280], dur: 16 },
  b: { d: "M80 120 C 160 150, 200 220, 300 240 S 440 330, 520 380 S 580 440, 610 470", rest: [300, 240], dur: 20 },
  c: { d: "M320 500 C 330 420, 300 360, 340 300 S 380 200, 360 120 S 340 60, 350 20", rest: [340, 300], dur: 24 },
};
const ROUTE_IDS = Object.keys(ROUTES) as RouteId[];

type Tone = "glass" | "card" | "bronze";
type Pill = { id: string; tone: Tone; style: CSSProperties; float: number; eyebrow?: string; text: ReactNode };

const PHASES: { id: PhaseId; active: RouteId[]; pills: Pill[] }[] = [
  {
    id: "live",
    active: ["a", "b", "c"],
    pills: [
      { id: "van", tone: "glass", style: { top: "8%", left: "3%" }, float: 4.4, text: <><Dot />Van 3 · 41 mph</> },
      { id: "road", tone: "card", style: { top: "6%", right: "3%" }, float: 5.1, eyebrow: "Live map", text: "6 of 8 drivers on the road" },
      { id: "idle", tone: "glass", style: { top: "42%", right: "3%" }, float: 5.6, eyebrow: "Idle", text: "Truck 7 · parked 4 min" },
      { id: "tag", tone: "bronze", style: { bottom: "9%", right: "8%" }, float: 4.2, text: "ON THE ROAD NOW" },
    ],
  },
  {
    id: "replay",
    active: ["a"],
    pills: [
      { id: "mode", tone: "glass", style: { top: "9%", left: "3%" }, float: 4.3, text: <><Dot />Drive replay</> },
      { id: "trip", tone: "card", style: { top: "5%", right: "3%" }, float: 5, eyebrow: "Tuesday", text: "18.4 mi · Depot to Harbour St" },
      { id: "bump", tone: "glass", style: { top: "44%", right: "2%" }, float: 5.4, eyebrow: "Bump", text: "0.4 g at 10:42" },
      { id: "tag", tone: "bronze", style: { bottom: "9%", right: "8%" }, float: 4.4, text: "SCRUB ANY DRIVE" },
    ],
  },
  {
    id: "mileage",
    active: ["b"],
    pills: [
      { id: "van", tone: "glass", style: { top: "9%", left: "3%" }, float: 4.6, text: <><Dot />Van 3 · 184 mi</> },
      { id: "report", tone: "card", style: { top: "6%", right: "3%" }, float: 5.2, eyebrow: "Weekly report", text: "Ready as CSV or PDF" },
      { id: "odo", tone: "glass", style: { top: "43%", right: "3%" }, float: 5.7, eyebrow: "Odometer", text: "62,418 → 62,602 mi" },
      { id: "tag", tone: "bronze", style: { bottom: "9%", right: "8%" }, float: 4.3, text: "READY TO SEND" },
    ],
  },
];

const PHASE_MS = 6500;
const PILL_EXIT_MS = 320;

const pillTone: Record<Tone, string> = {
  glass: "border border-white/15 bg-white/10 text-foreground backdrop-blur-sm",
  card: "bg-foreground text-background shadow-xl",
  bronze: "bg-primary text-primary-foreground font-semibold shadow-lg",
};

function Dot() {
  return <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" aria-hidden />;
}

export function FleetVisual() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [shown, setShown] = useState(true);
  const phase = PHASES[stage];

  useEffect(() => {
    if (reduce) return;
    let inner: number | undefined;
    const id = window.setInterval(() => {
      setShown(false);
      inner = window.setTimeout(() => {
        setStage((current) => (current + 1) % PHASES.length);
        setShown(true);
      }, PILL_EXIT_MS);
    }, PHASE_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(inner);
    };
  }, [reduce]);

  return (
    <div className="rise relative h-[22rem] sm:h-[26rem] md:h-[32rem]" style={{ animationDelay: "120ms" }}>
      <div className="absolute inset-0 overflow-hidden border border-border bg-surface">
        <svg
          viewBox="0 0 640 520"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
          role="img"
          aria-label="Illustration of vehicles moving along routes on a map"
        >
          <defs>
            <pattern id="fv-grid" width="52" height="52" patternUnits="userSpaceOnUse">
              <path d="M52 0H0V52" fill="none" stroke="var(--border)" strokeWidth="1" />
            </pattern>
            <radialGradient id="fv-fade" cx="50%" cy="50%" r="70%">
              <stop offset="55%" style={{ stopColor: "var(--surface)", stopOpacity: 0 }} />
              <stop offset="100%" style={{ stopColor: "var(--surface)", stopOpacity: 1 }} />
            </radialGradient>
          </defs>

          {/* Streets */}
          <g opacity="0.7">
            <rect x="-200" y="-200" width="1040" height="920" fill="url(#fv-grid)" transform="rotate(-18 320 260)" />
          </g>
          <path d="M-20 360 C 120 330, 220 410, 340 380 S 560 300, 700 330" fill="none" stroke="var(--surface-3)" strokeWidth="26" strokeLinecap="round" opacity="0.8" />

          {/* Routes */}
          {ROUTE_IDS.map((id) => {
            const on = phase.active.includes(id);
            return (
              <g key={id}>
                <path
                  d={ROUTES[id].d}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ opacity: on ? 0.35 : 0.12, transition: "opacity 0.6s" }}
                />
                {on && (
                  <path
                    key={`${phase.id}-${id}`}
                    d={ROUTES[id].d}
                    pathLength={1}
                    fill="none"
                    stroke="var(--primary-hover)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="route-draw"
                  />
                )}
              </g>
            );
          })}

          {/* Depots */}
          <rect x="52" y="422" width="16" height="16" fill="var(--primary)" />
          <rect x="72" y="112" width="16" height="16" fill="var(--primary)" opacity="0.6" />

          {/* Vehicles */}
          {ROUTE_IDS.map((id) => {
            const on = phase.active.includes(id);
            const route = ROUTES[id];
            return (
              <g key={`v-${id}`} style={{ opacity: on ? 1 : 0, transition: "opacity 0.6s" }}>
                {reduce ? (
                  <g transform={`translate(${route.rest[0]} ${route.rest[1]})`}>
                    <Vehicle />
                  </g>
                ) : (
                  <g>
                    <animateMotion dur={`${route.dur}s`} repeatCount="indefinite" path={route.d} />
                    <Vehicle ping />
                  </g>
                )}
              </g>
            );
          })}

          <rect width="640" height="520" fill="url(#fv-fade)" pointerEvents="none" />
        </svg>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{ opacity: shown ? 1 : 0 }}
      >
        {phase.pills.map((pill, i) => (
          <div
            key={`${phase.id}-${pill.id}`}
            className="pill-in absolute max-w-[13rem]"
            style={{ ...pill.style, animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`pill-float rounded-full px-4 py-2 text-xs ${pillTone[pill.tone]}`}
              style={{ animationDuration: `${pill.float}s` }}
            >
              {pill.eyebrow && (
                <p
                  className={`text-[10px] uppercase tracking-[0.14em] ${
                    pill.tone === "card" ? "font-semibold text-primary" : "text-muted"
                  }`}
                >
                  {pill.eyebrow}
                </p>
              )}
              <p className="font-medium leading-snug">{pill.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Vehicle({ ping = false }: { ping?: boolean }) {
  return (
    <>
      {ping && <circle r="7" fill="var(--primary)" className="ping" />}
      <circle r="6.5" fill="var(--background)" />
      <circle r="4.5" fill="var(--primary-hover)" />
    </>
  );
}
