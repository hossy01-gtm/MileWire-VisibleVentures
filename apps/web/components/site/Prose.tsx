import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/**
 * Page hero: eyebrow, headline, lead, CTAs and an optional visual on the right.
 * Same anatomy as the TNAG acquisitions hero, on the bronze dark theme.
 * The entrance is CSS-only (`.rise`) so it never waits on hydration.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  visual,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="hero-atmosphere pointer-events-none absolute inset-0" aria-hidden />
      <div
        className={`relative mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24 ${
          visual ? "grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] md:items-center" : ""
        }`}
      >
        <div>
          {eyebrow && (
            <p className="rise text-sm font-semibold tracking-tight text-primary md:text-base">{eyebrow}</p>
          )}
          <h1
            className="rise mt-4 max-w-3xl text-4xl font-medium leading-[1.05] tracking-tight text-foreground md:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            {title}
          </h1>
          {lead && (
            <p
              className="rise mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg"
              style={{ animationDelay: "100ms" }}
            >
              {lead}
            </p>
          )}
          {children && (
            <div className="rise mt-10" style={{ animationDelay: "140ms" }}>
              {children}
            </div>
          )}
        </div>
        {visual ? <div className="relative">{visual}</div> : null}
      </div>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone = "default",
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  tone?: "default" | "surface";
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 border-b border-border ${tone === "surface" ? "bg-surface" : "bg-background"}`}
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <Reveal>
          {eyebrow && <p className="site-eyebrow mb-4">{eyebrow}</p>}
          {title && (
            <h2 className="max-w-3xl text-3xl font-medium leading-tight tracking-tight md:text-4xl">{title}</h2>
          )}
          {lead && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{lead}</p>}
        </Reveal>
        <Reveal className={title || lead ? "mt-10" : ""} delay={0.06}>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

const ctaBase =
  "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-colors";

export function CtaButton({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const className = `${ctaBase} ${
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
      : "border border-foreground/25 text-foreground hover:border-primary hover:text-primary"
  }`;

  // Plain anchors on purpose: these go to in-page sections or into the auth-gated console,
  // where a full page load is the most reliable way in (no client-router prefetch or validation).
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}
