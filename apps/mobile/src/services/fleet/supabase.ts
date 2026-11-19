import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_KEY, SUPABASE_URL, hasSupabase } from '@/lib/config';

let client: SupabaseClient | null = null;

/** Lazily-created client; null when Supabase is not configured (app still works offline). */
export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Drivers never sign up: each install gets an anonymous Supabase identity so a
 * fleet manager can attribute drives to a join code without collecting a password.
 */
export async function ensureUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error) return null;
  return anon.user?.id ?? null;
}
