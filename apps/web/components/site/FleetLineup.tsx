import type { ReactNode } from "react";
import { DEMO_VEHICLES } from "@/lib/data/demoData";

/**
 * A lineup of three fleet vehicles (van, truck, hatchback) drawn as flat side-on
 * illustrations on one shared road line. Each carries a tag with the label and
 * odometer of the matching vehicle in the sample fleet, so the picture and the
 * console screenshots tell the same story. Static SVG, no client JavaScript.
 */

const BRONZE = "#cd7f32";
const GROUND = 184;

function Wheel({ cx, r = 24 }: { cx: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={GROUND - r} r={r} fill="#151210" />
      <circle cx={cx} cy={GROUND - r} r={r * 0.62} fill="#8f867b" />
      <circle cx={cx} cy={GROUND - r} r={r * 0.5} fill="#b9b0a4" />
      <circle cx={cx} cy={GROUND - r} r={r * 0.2} fill="#2a2420" />
    </g>
  );
}

/** Wheel-arch cut-out drawn in the page background so the body reads as sitting on the wheel. */
function Arch({ cx, r = 30 }: { cx: number; r?: number }) {
  return <circle cx={cx} cy={GROUND - 24} r={r} fill="var(--background)" />;
}

function Road({ id }: { id: string }) {
  return (
    <>
      <ellipse cx="220" cy={GROUND} rx="196" ry="7" fill="#000" opacity="0.5" />
      <line x1="0" x2="440" y1={GROUND + 0.5} y2={GROUND + 0.5} stroke="var(--border)" strokeWidth="1" />
      <line x1="0" x2="440" y1={GROUND + 12} y2={GROUND + 12} stroke="var(--surface-3)" strokeWidth="2" strokeDasharray="18 14" />
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5866" />
          <stop offset="1" stopColor="#1b2128" />
        </linearGradient>
      </defs>
    </>
  );
}

function Van() {
  return (
    <svg viewBox="0 0 440 200" className="block w-full" role="img" aria-label="Illustration of a white cargo van">
      <defs>
        <linearGradient id="van-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f1ea" />
          <stop offset="0.7" stopColor="#d9d1c6" />
          <stop offset="1" stopColor="#b3a99c" />
        </linearGradient>
      </defs>
      <Road id="van" />
      <path
        d="M16 160V62Q16 44 34 44H282Q296 44 306 56L350 106Q356 112 366 114L404 120Q420 123 420 138V160Q420 168 412 168H16Z"
        fill="url(#van-body)"
      />
      <path d="M30 48H280" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 122H410" stroke={BRONZE} strokeWidth="5" />
      <path d="M286 58H300L344 106H286Z" fill="url(#van-glass)" />
      <path d="M286 58H300L344 106" fill="none" stroke="#fff" strokeOpacity="0.18" />
      <path d="M284 56V164M152 52V162" stroke="#000" strokeOpacity="0.22" strokeWidth="1.5" />
      <rect x="266" y="112" width="12" height="3.5" rx="1.5" fill="#6f665c" />
      <rect x="136" y="112" width="12" height="3.5" rx="1.5" fill="#6f665c" />
      <rect x="348" y="98" width="16" height="10" rx="3" fill="#8a8176" />
      <rect x="16" y="96" width="5" height="20" rx="2" fill="#c9483f" />
      <path d="M408 124H420V136H404Z" fill="#f7e8c9" />
      <rect x="404" y="150" width="16" height="8" fill="#6f665c" />
      <Arch cx={100} />
      <Arch cx={330} />
      <Wheel cx={100} />
      <Wheel cx={330} />
    </svg>
  );
}

function Truck() {
  return (
    <svg viewBox="0 0 440 200" className="block w-full" role="img" aria-label="Illustration of a box truck">
      <defs>
        <linearGradient id="truck-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f1ea" />
          <stop offset="0.7" stopColor="#d9d1c6" />
          <stop offset="1" stopColor="#b3a99c" />
        </linearGradient>
        <linearGradient id="truck-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ece5db" />
          <stop offset="1" stopColor="#a99f92" />
        </linearGradient>
      </defs>
      <Road id="truck" />
      <rect x="10" y="156" width="420" height="14" rx="3" fill="#2a2420" />
      <rect x="10" y="22" width="266" height="136" rx="6" fill="url(#truck-body)" />
      <path d="M22 26H264" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      {[62, 114, 166, 218].map((x) => (
        <path key={x} d={`M${x} 30V152`} stroke="#000" strokeOpacity="0.14" strokeWidth="1.5" />
      ))}
      <rect x="10" y="84" width="266" height="8" fill={BRONZE} />
      <rect x="10" y="62" width="5" height="22" rx="2" fill="#c9483f" />
      <path
        d="M282 160V66Q282 52 294 52H340Q352 52 360 62L388 104L418 112Q430 115 430 130V160Q430 168 422 168H282Z"
        fill="url(#truck-cab)"
      />
      <path d="M298 62H340L376 104H298Z" fill="url(#truck-glass)" />
      <path d="M298 62H340L376 104" fill="none" stroke="#fff" strokeOpacity="0.18" />
      <path d="M296 56V164" stroke="#000" strokeOpacity="0.22" strokeWidth="1.5" />
      <rect x="282" y="112" width="148" height="5" fill={BRONZE} />
      <rect x="378" y="90" width="14" height="22" rx="3" fill="#8a8176" />
      <path d="M418 124H430V138H414Z" fill="#f7e8c9" />
      <rect x="418" y="152" width="14" height="8" fill="#6f665c" />
      <Arch cx={84} r={32} />
      <Arch cx={338} r={32} />
      <Wheel cx={84} r={26} />
      <Wheel cx={338} r={26} />
    </svg>
  );
}

function Hatchback() {
  return (
    <svg viewBox="0 0 440 200" className="block w-full" role="img" aria-label="Illustration of a hatchback car">
      <defs>
        <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d99655" />
          <stop offset="0.55" stopColor="#b2692a" />
          <stop offset="1" stopColor="#7d4619" />
        </linearGradient>
      </defs>
      <Road id="car" />
      <path
        d="M42 156V124Q42 108 54 100L100 70Q110 64 124 64H268Q286 64 298 76L330 108L382 114Q402 118 402 134V156Q402 164 394 164H50Q42 164 42 156Z"
        fill="url(#car-body)"
      />
      <path d="M126 68H266" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 130H398" stroke="#f3ede6" strokeOpacity="0.85" strokeWidth="3" />
      <path d="M126 74H198V106H78L104 86Q114 74 126 74Z" fill="url(#car-glass)" />
      <path d="M206 74H266Q276 74 284 82L312 106H206Z" fill="url(#car-glass)" />
      <path d="M202 70V152" stroke="#000" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <rect x="180" y="114" width="14" height="3.5" rx="1.5" fill="#f3ede6" opacity="0.7" />
      <rect x="296" y="108" width="16" height="9" rx="3" fill="#5c3a1c" />
      <rect x="42" y="112" width="5" height="16" rx="2" fill="#c9483f" />
      <path d="M390 120H402V132H386Z" fill="#f7e8c9" />
      <rect x="388" y="146" width="14" height="8" fill="#5c3a1c" />
      <Arch cx={120} r={28} />
      <Arch cx={326} r={28} />
      <Wheel cx={120} r={22} />
      <Wheel cx={326} r={22} />
    </svg>
  );
}

type Item = { id: string; art: ReactNode; float: number };

const ART: Record<string, Pick<Item, "art" | "float">> = {
  "veh-12": { art: <Van />, float: 4.6 },
  "veh-3": { art: <Truck />, float: 5.2 },
  "veh-7": { art: <Hatchback />, float: 4.9 },
};

// Order the lineup the way the sample fleet is built: van, truck, hatchback.
const ORDER = ["veh-12", "veh-3", "veh-7"];

export function FleetLineup() {
  const vehicles = ORDER.map((id) => DEMO_VEHICLES.find((v) => v.id === id)).filter((v) => v !== undefined);
  return (
    <div className="relative overflow-hidden border border-border bg-background">
      <div className="relative grid gap-y-16 px-4 pb-6 pt-16 sm:grid-cols-3 sm:gap-y-0 sm:px-8">
        {vehicles.map((v) => {
          const { art, float } = ART[v.id];
          return (
            <figure key={v.id} className="relative">
              <div className="absolute left-1/2 top-[-3.25rem] -translate-x-1/2">
                <div
                  className="pill-float whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs backdrop-blur-sm"
                  style={{ animationDuration: `${float}s` }}
                >
                  <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" aria-hidden />
                  <span className="font-medium">{v.label}</span>
                  <span className="mono ml-2 text-muted">{Math.round(v.baselineOdometerKm).toLocaleString("en-US")} km</span>
                </div>
              </div>
              {art}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
