/**
 * Public, build-time configuration. Next.js inlines `process.env.NEXT_PUBLIC_*`
 * only for literal property access, so each variable is read by name here.
 * See `.env.example`. Nothing in this file is a secret.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
export const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "").trim();
export const CESIUM_ION_TOKEN = (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "").trim();

export const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
export const hasMapbox = MAPBOX_TOKEN.length > 0;

/**
 * Demo mode runs the whole console on built-in sample data with no sign-in.
 * It is on when Supabase is not configured, or when forced with
 * NEXT_PUBLIC_MILEWIRE_DEMO=1.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_MILEWIRE_DEMO === "1" || !hasSupabase;
