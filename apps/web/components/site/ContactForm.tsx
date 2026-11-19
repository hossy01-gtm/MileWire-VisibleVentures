"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { PLAN_OPTIONS, isPlanId, validateContactSales, type ContactSalesErrors } from "@/lib/contact-sales";

const inputClass =
  "w-full border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none";

function Row({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span role="alert" className="block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

/** Contact-sales form. Posts to /api/contact-sales, which holds the recipient and the Resend credentials. */
export function ContactForm() {
  const params = useSearchParams().get("plan");
  const [plan, setPlan] = useState(isPlanId(params) ? params : PLAN_OPTIONS[0].id);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<ContactSalesErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const f = new FormData(e.currentTarget);
    const values = Object.fromEntries(["name", "email", "company", "drivers", "message", "website"].map((k) => [k, String(f.get(k) ?? "")]));
    const payload = { ...values, plan };

    const check = validateContactSales(payload);
    setFormError(null);
    if (!check.ok) return setErrors(check.errors);
    setErrors({});
    setState("sending");
    try {
      const res = await fetch("/api/contact-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errors?: ContactSalesErrors };
      if (res.ok && body.ok) return setState("sent");
      if (body.errors) setErrors(body.errors);
      setFormError(body.message ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    }
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div role="status" className="border border-border bg-surface p-8">
        <h2 className="text-2xl font-medium tracking-tight">Thanks, we have your message.</h2>
        <p className="mt-3 leading-relaxed text-muted">We will reply by email with a quote.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 border border-border bg-surface p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Name" error={errors.name}>
          <input name="name" autoComplete="name" maxLength={100} required className={inputClass} />
        </Row>
        <Row label="Work email" error={errors.email}>
          <input name="email" type="email" autoComplete="email" maxLength={254} required className={inputClass} />
        </Row>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Company or fleet" error={errors.company}>
          <input name="company" autoComplete="organization" maxLength={120} required className={inputClass} />
        </Row>
        <Row label="Plan" error={errors.plan}>
          <select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className={inputClass}>
            {PLAN_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </Row>
      </div>
      <Row label="Number of drivers (optional)" error={errors.drivers}>
        <input name="drivers" inputMode="numeric" maxLength={20} className={inputClass} />
      </Row>
      <Row label="How can we help?" error={errors.message}>
        <textarea name="message" rows={5} maxLength={5000} required className={inputClass} />
      </Row>

      {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {formError ? <p role="alert" className="text-sm text-danger">{formError}</p> : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex items-center justify-center bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send to sales"}
      </button>
      <p className="text-xs text-subtle">We only use your details to reply to this enquiry.</p>
    </form>
  );
}
