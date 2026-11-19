/**
 * Public, build-time configuration. Expo inlines `process.env.EXPO_PUBLIC_*`
 * only for static property access, so each variable is read literally here.
 * See `.env.example` — nothing in this file is a secret.
 */
export const MAPBOX_TOKEN = (process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '').trim();
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_KEY = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
).trim();

export const hasMapbox = MAPBOX_TOKEN.length > 0;
export const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
