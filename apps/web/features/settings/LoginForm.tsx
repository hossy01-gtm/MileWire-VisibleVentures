"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const { status, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signedIn") router.replace("/map");
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result === "confirm") setNotice("Check your email to confirm your address, then sign in.");
    else if (result) setError(result);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={48} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{mode === "in" ? "Sign in to MileWire" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-muted">Live fleet tracking, drive replay and mileage reports.</p>
          </div>
        </div>

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password" hint={mode === "up" ? "At least 6 characters." : undefined}>
              <Input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error ? <ErrorNote message={error} /> : null}
            {notice ? <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{notice}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          {mode === "in" ? "New to MileWire?" : "Already have an account?"}{" "}
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); setNotice(null); }}>
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
