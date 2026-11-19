import type { Metadata } from "next";
import { ClosingCta, FeatureGrid, PricingCards, StepCards, ValueGrid } from "@/components/site/Content";
import { FleetVisual } from "@/components/site/FleetVisual";
import { CtaButton, PageHero, Section } from "@/components/site/Prose";
import { CubeIcon, GaugeIcon, PinIcon, PulseIcon, RewindIcon, TruckIcon, UsersIcon } from "@/components/site/icons";
import { siteCopy as copy } from "@/lib/site-copy";

export const metadata: Metadata = {
  title: { absolute: "MileWire · Fleet tracking without the telematics project" },
  description: copy.hero.lead,
};

// One icon per console feature, in the same order as copy.console.features.
const featureIcons = [PinIcon, RewindIcon, CubeIcon, PulseIcon, TruckIcon, GaugeIcon, UsersIcon];

export default function Home() {
  return (
    <>
      <PageHero eyebrow={copy.hero.eyebrow} title={copy.hero.title} lead={copy.hero.lead} visual={<FleetVisual />}>
        <div className="flex flex-wrap gap-3">
          <CtaButton to={copy.hero.primary.to}>{copy.hero.primary.label}</CtaButton>
          <CtaButton to={copy.hero.secondary.to} variant="ghost">
            {copy.hero.secondary.label}
          </CtaButton>
        </div>
      </PageHero>

      <div className="border-b border-border bg-surface">
        <p className="mx-auto max-w-7xl whitespace-pre-wrap px-6 py-8 text-sm uppercase tracking-[0.24em] text-muted">
          {copy.strip}
        </p>
      </div>

      <Section id="how-it-works" eyebrow={copy.how.eyebrow} title={copy.how.title} lead={copy.how.lead}>
        <StepCards steps={copy.how.steps} />
      </Section>

      <Section id="console" eyebrow={copy.console.eyebrow} title={copy.console.title} lead={copy.console.lead} tone="surface">
        <FeatureGrid features={copy.console.features} icons={featureIcons} cta={copy.console.cta} />
      </Section>

      <Section id="why" eyebrow={copy.why.eyebrow} title={copy.why.title} lead={copy.why.lead}>
        <ValueGrid points={copy.why.points} />
      </Section>

      <Section id="pricing" eyebrow={copy.pricing.eyebrow} title={copy.pricing.title} lead={copy.pricing.lead} tone="surface">
        <PricingCards plans={copy.pricing.plans} cta={copy.pricing.cta} />
      </Section>

      <ClosingCta
        title={copy.closing.title}
        body={copy.closing.body}
        primary={copy.closing.primary}
        secondary={copy.closing.secondary}
      />
    </>
  );
}
