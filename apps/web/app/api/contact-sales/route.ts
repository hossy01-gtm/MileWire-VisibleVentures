import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { PLAN_OPTIONS, validateContactSales } from "@/lib/contact-sales";

/**
 * Contact sales. Server-only: the recipient and the Resend credentials are read from the
 * environment here and never reach the browser.
 *
 *   RESEND_API_KEY    Resend API key
 *   EMAIL_FROM        Verified sender, e.g. "MileWire <noreply@your-verified-domain.com>"
 *   CONTACT_SALES_TO  Inbox that receives enquiries
 *
 * Sends through Resend with a plain fetch to its REST API (no SDK).
 */

const RESEND_URL = "https://api.resend.com/emails";
const MAX_BODY_BYTES = 16_000;

// Best-effort limiter. Serverless instances do not share memory, so this slows casual abuse only.
const WINDOW_MS = 60 * 60 * 1000;
const IP_LIMIT = 8;
const EMAIL_LIMIT = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();

function allow(key: string, limit: number): boolean {
  const now = Date.now();
  if (buckets.size > 2000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Browser form posts come from our own origin; refuse anything else. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const log = (outcome: string, detail?: string) =>
    console.info(JSON.stringify({ event: "contact_sales", requestId, outcome, detail, ipHash: createHash("sha256").update(ip).digest("hex").slice(0, 16) }));

  if (!sameOrigin(request)) {
    log("bad_origin");
    return reply(403, { ok: false, message: "Request rejected." });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return reply(415, { ok: false, message: "Unsupported request." });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return reply(413, { ok: false, message: "That message is too long." });
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    raw = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { ok: false, message: "Unsupported request." });
  }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
  if (typeof raw.website === "string" && raw.website.trim()) {
    log("honeypot");
    return reply(200, { ok: true });
  }

  const result = validateContactSales(raw);
  if (!result.ok) return reply(400, { ok: false, errors: result.errors, message: "Please check the highlighted fields." });
  const { data } = result;

  if (!allow(`ip:${ip}`, IP_LIMIT) || !allow(`email:${data.email}`, EMAIL_LIMIT)) {
    log("rate_limited");
    return reply(429, { ok: false, message: "Too many requests. Please try again later." });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const to = process.env.CONTACT_SALES_TO?.trim();
  if (!apiKey || !from || !to) {
    log("not_configured");
    return reply(503, { ok: false, message: "Contact is temporarily unavailable. Please try again later." });
  }

  const plan = PLAN_OPTIONS.find((p) => p.id === data.plan)!.label;
  const body = [
    "New MileWire sales enquiry",
    `Request ID: ${requestId}`,
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    `Plan: ${plan}`,
    `Drivers: ${data.drivers || "(not provided)"}`,
    "",
    "Message:",
    data.message,
  ].join("\n");

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: data.email, subject: `[MileWire] ${plan} enquiry from ${data.name}`, text: body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      log("relay_error", String(res.status));
      return reply(502, { ok: false, message: "We couldn't send your message. Please try again shortly." });
    }
  } catch {
    log("relay_exception");
    return reply(502, { ok: false, message: "We couldn't send your message. Please try again shortly." });
  }

  log("success");
  return reply(200, { ok: true });
}
