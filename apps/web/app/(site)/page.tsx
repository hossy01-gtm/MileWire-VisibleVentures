import type { Metadata } from "next";
import { ClosingCta, FeatureGrid, PricingCards, StepCards, ValueGrid } from "@/components/site/Content";
import { ChartsShowcase } from "@/components/site/ChartsShowcase";
import { FleetLineup } from "@/components/site/FleetLineup";
import { FocusShowcase } from "@/components/site/FocusShowcase";
import { ProductShot } from "@/components/site/ProductShot";
import { SpeedChart } from "@/features/fleets/charts";
import { sampleDrive } from "@/components/site/sample-drive";
import { CtaButton, PageHero, Section } from "@/components/site/Prose";
import { CubeIcon, GaugeIcon, PinIcon, PulseIcon, RewindIcon, TruckIcon, UsersIcon } from "@/components/site/icons";
import { siteCopy as copy } from "@/lib/site-copy";

export const metadata: Metadata = {
  title: { absolute: "MileWire · Fleet tracking without the telematics project" },
  description: copy.hero.lead,
};

// One icon per console feature, in the same order as copy.console.features.
const featureIcons = [PinIcon, RewindIcon, CubeIcon, PulseIcon, TruckIcon, GaugeIcon, UsersIcon];

/** Hero visual: the real 3D replay, with the console's own speed chart floating over it. */
function HeroVisual() {
  const drive = sampleDrive();
  return (
    <ProductShot
      src="/landing/replay-3d.webp"
      alt="MileWire drive replay: a recorded drive over photorealistic 3D city tiles, with speed and motion charts beside it"
      width={2000}
      height={1471}
      sizes="(min-width: 768px) 55vw, 100vw"
      priority
      className="rise"
    >
      <div className="absolute left-[3%] top-[18%] hidden w-[34%] border border-border bg-background/90 p-3 shadow-xl backdrop-blur sm:block">
        <p className="eyebrow mb-1">Speed</p>
        <SpeedChart path={drive.path} jolts={drive.jolts} cursorMs={drive.durationMs * 0.42} unit="km" className="h-14" />
      </div>
    </ProductShot>
  );
}

export default function Home() {
  return (
    <>
      <PageHero eyebrow={copy.hero.eyebrow} title={copy.hero.title} lead={copy.hero.lead} visual={<HeroVisual />}>
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

      <Section id="vehicles" eyebrow={copy.lineup.eyebrow} title={copy.lineup.title} lead={copy.lineup.lead} tone="surface">
        <FleetLineup />
      </Section>

      <Section id="console" eyebrow={copy.console.eyebrow} title={copy.console.title} lead={copy.console.lead}>
        <div className="space-y-16">
          <FocusShowcase title={copy.console.focus.title} body={copy.console.focus.body} modes={copy.console.focus.modes} />
          <FeatureGrid features={copy.console.features} icons={featureIcons} cta={copy.console.cta} />
        </div>
      </Section>

      <Section id="charts" eyebrow={copy.charts.eyebrow} title={copy.charts.title} lead={copy.charts.lead} tone="surface">
        <ChartsShowcase />
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
