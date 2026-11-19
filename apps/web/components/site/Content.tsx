import type { ComponentType, SVGProps } from "react";
import { CtaButton } from "./Prose";
import { ArrowRightIcon } from "./icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/** Numbered steps in a 1px-gap grid, three across on large screens. */
export function StepCards({ steps }: { steps: readonly { title: string; body: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
      {steps.map((step, index) => (
        <article key={step.title} className="flex flex-col bg-surface p-8">
          <span className="mono text-sm text-primary">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="mt-6 text-2xl font-medium tracking-tight md:text-3xl">{step.title}</h3>
          <p className="mt-4 flex-1 leading-relaxed text-muted">{step.body}</p>
        </article>
      ))}
    </div>
  );
}

/** Icon grid; the last cell is a call to action so the grid always closes evenly. */
export function FeatureGrid({
  features,
  icons,
  cta,
}: {
  features: readonly { title: string; body: string }[];
  icons: readonly Icon[];
  cta: { label: string; to: string };
}) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, index) => {
        const Glyph = icons[index];
        return (
          <div key={feature.title} className="bg-background p-6">
            <Glyph className="size-6 text-primary" />
            <p className="mt-4 text-base font-medium">{feature.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
          </div>
        );
      })}
      <div className="flex items-end bg-primary-soft p-6">
        <CtaButton to={cta.to} variant="ghost">
          {cta.label}
          <ArrowRightIcon />
        </CtaButton>
      </div>
    </div>
  );
}

/** Four statements in a 1px-gap grid. */
export function ValueGrid({ points }: { points: readonly { title: string; body: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {points.map((point) => (
        <div key={point.title} className="flex flex-col bg-surface p-8">
          <span className="block h-0.5 w-8 bg-primary" aria-hidden />
          <h3 className="mt-6 text-xl font-medium tracking-tight">{point.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{point.body}</p>
        </div>
      ))}
    </div>
  );
}

/** Two plans side by side. Both lead to the contact-sales form with the plan preselected. */
export function PricingCards({
  plans,
  cta,
}: {
  plans: readonly { id: string; name: string; audience: string; price: string; priceNote: string; features: readonly string[] }[];
  cta: string;
}) {
  return (
    <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
      {plans.map((plan) => (
        <article key={plan.id} className="flex flex-col bg-surface p-8 md:p-10">
          <h3 className="text-2xl font-medium tracking-tight md:text-3xl">{plan.name}</h3>
          <p className="mt-2 text-sm text-muted">{plan.audience}</p>
          <p className="mt-8 text-3xl font-medium tracking-tight">{plan.price}</p>
          <p className="mt-1 text-sm text-subtle">{plan.priceNote}</p>
          <ul className="mt-8 flex-1 space-y-3 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-3 leading-relaxed text-muted">
                <span className="mt-2 block h-0.5 w-3 shrink-0 bg-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <CtaButton to={`/contact?plan=${plan.id}`}>
              {cta}
              <ArrowRightIcon />
            </CtaButton>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ClosingCta({
  title,
  body,
  primary,
  secondary,
}: {
  title?: string;
  body?: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-atmosphere pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
        {title && <h2 className="max-w-3xl text-3xl font-medium tracking-tight md:text-5xl">{title}</h2>}
        {body && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{body}</p>}
        <div className={`flex flex-wrap gap-3 ${title || body ? "mt-10" : ""}`}>
          <CtaButton to={primary.to}>{primary.label}</CtaButton>
          {secondary && (
            <CtaButton to={secondary.to} variant="ghost">
              {secondary.label}
            </CtaButton>
          )}
        </div>
      </div>
    </section>
  );
}
