"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_MODE } from "./config";
import { DEMO_USER } from "./data/demoData";
import { getSupabase } from "./supabase";

type User = { id: string; email: string };
type Status = "loading" | "signedOut" | "signedIn";

type AuthValue = {
  status: Status;
  user: User | null;
  demo: boolean;
  /** Resolves to an error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; user: User | null }>(
    DEMO_MODE ? { status: "signedIn", user: DEMO_USER } : { status: "loading", user: null },
  );

  useEffect(() => {
    if (DEMO_MODE) return;
    const sb = getSupabase();
    if (!sb) return;
    const apply = (u: { id: string; email?: string | null; is_anonymous?: boolean } | null | undefined) =>
      // Anonymous identities belong to drivers on the phone app; they are not console users.
      u && !u.is_anonymous ? setState({ status: "signedIn", user: { id: u.id, email: u.email ?? "" } }) : setState({ status: "signedOut", user: null });
    void sb.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => apply(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return "MileWire is not connected to a database.";
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    return error ? "Email or password is incorrect." : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    if (!DEMO_MODE) setState({ status: "signedOut", user: null });
  }, []);

  const value = useMemo<AuthValue>(() => ({ ...state, demo: DEMO_MODE, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
