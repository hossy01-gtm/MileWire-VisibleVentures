import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const PinIcon = (p: P) => (<svg {...base(p)}><path d="M12 21s7-5.6 7-11.5A7 7 0 0 0 5 9.5C5 15.4 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const RewindIcon = (p: P) => (<svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></svg>);
export const CubeIcon = (p: P) => (<svg {...base(p)}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m12 12 8-4.5M12 12 4 7.5M12 12v9" /></svg>);
export const PulseIcon = (p: P) => (<svg {...base(p)}><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></svg>);
export const TruckIcon = (p: P) => (<svg {...base(p)}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>);
export const GaugeIcon = (p: P) => (<svg {...base(p)}><path d="M4 18a9 9 0 1 1 16 0" /><path d="m12 14 4-5" /><circle cx="12" cy="14" r="1.2" /></svg>);
export const UsersIcon = (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4c1.9.8 3 2.7 3 5.6" /></svg>);
export const ArrowRightIcon = (p: P) => (<svg {...base({ width: 16, height: 16, ...p })}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const MenuIcon = (p: P) => (<svg {...base({ width: 20, height: 20, ...p })}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const CloseIcon = (p: P) => (<svg {...base({ width: 20, height: 20, ...p })}><path d="M6 6l12 12M18 6 6 18" /></svg>);
