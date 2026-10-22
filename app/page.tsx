import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function SetupMessage() {
  await connection();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data, error } = await supabase
    .from("setup_check")
    .select("message")
    .order("id")
    .limit(1)
    .single();
  return <>{error ? `Supabase error: ${error.message}` : data.message}</>;
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">MileWire</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Coming soon from MileWire.
      </p>
      <p className="text-sm text-zinc-500">
        <Suspense fallback="Connecting to Supabase…">
          <SetupMessage />
        </Suspense>
      </p>
    </main>
  );
}
