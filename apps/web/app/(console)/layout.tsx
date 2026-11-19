import { Suspense } from "react";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { Spinner } from "@/components/ui";

const fallback = (
  <div className="flex h-screen items-center justify-center">
    <Spinner />
  </div>
);

export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={fallback}>
      <ConsoleShell>
        <Suspense fallback={<div className="p-8"><Spinner /></div>}>{children}</Suspense>
      </ConsoleShell>
    </Suspense>
  );
}
