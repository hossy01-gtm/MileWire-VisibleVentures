import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contact sales",
  description: "Tell us about your fleet and we will send you a quote.",
};

export default function ContactPage() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:py-24">
        <div>
          <p className="site-eyebrow mb-4">Contact sales</p>
          <h1 className="text-4xl font-medium leading-tight tracking-tight md:text-5xl">Tell us about your fleet.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Share a little about your drivers and what you want to track. We will reply by email with a quote.
          </p>
        </div>
        <Suspense>
          <ContactForm />
        </Suspense>
      </div>
    </section>
  );
}
