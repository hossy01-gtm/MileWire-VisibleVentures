/**
 * Contact-sales form: field rules shared by the browser form and the API route.
 * The route re-validates everything; the browser copy only gives faster feedback.
 */

export const PLAN_OPTIONS = [
  { id: "fleet", label: "Fleet" },
  { id: "multi-fleet", label: "Multi-fleet" },
] as const;

export type PlanId = (typeof PLAN_OPTIONS)[number]["id"];

export const isPlanId = (value: unknown): value is PlanId => PLAN_OPTIONS.some((p) => p.id === value);

export type ContactSalesInput = {
  name: string;
  email: string;
  company: string;
  plan: PlanId;
  drivers: string;
  message: string;
};

export type ContactSalesErrors = Partial<Record<keyof ContactSalesInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strips control characters (including CR/LF, which could inject mail headers) and trims. */
const clean = (v: unknown, max: number) =>
  (typeof v === "string" ? v : "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

export function validateContactSales(
  raw: Record<string, unknown>,
): { ok: true; data: ContactSalesInput } | { ok: false; errors: ContactSalesErrors } {
  const data = {
    name: clean(raw.name, 100).replace(/[\r\n]+/g, " "),
    email: clean(raw.email, 254).toLowerCase(),
    company: clean(raw.company, 120).replace(/[\r\n]+/g, " "),
    plan: raw.plan,
    drivers: clean(raw.drivers, 20).replace(/[\r\n]+/g, " "),
    message: clean(raw.message, 5000),
  };
  const errors: ContactSalesErrors = {};
  if (!data.name) errors.name = "Enter your name.";
  if (!EMAIL.test(data.email)) errors.email = "Enter a valid email address.";
  if (!data.company) errors.company = "Enter your company or fleet name.";
  if (!isPlanId(data.plan)) errors.plan = "Choose a plan.";
  if (!data.message) errors.message = "Tell us a little about your fleet.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: data as ContactSalesInput };
}
