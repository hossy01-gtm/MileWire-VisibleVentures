"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signedIn") router.replace("/map");
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={48} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to MileWire</h1>
            <p className="mt-1 text-sm text-muted">Live fleet tracking, drive replay and mileage reports.</p>
          </div>
        </div>

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error ? <ErrorNote message={error} /> : null}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</Button>
          </form>
        </Card>

        <p className="text-center text-xs text-subtle">Access is limited to the demo account.</p>
      </div>
    </main>
  );
}
