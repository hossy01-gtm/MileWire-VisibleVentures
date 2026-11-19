"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "../Logo";
import { LogOutIcon, MapIcon, MenuIcon, SettingsIcon, TruckIcon } from "../icons";
import { Badge, Select, Spinner, cn } from "../ui";
import { FleetProvider, useFleets } from "./FleetProvider";

const NAV = [
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/fleets", label: "Fleets", icon: TruckIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function ConsoleShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);

  if (status !== "signedIn") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  return (
    <FleetProvider>
      <Frame>{children}</Frame>
    </FleetProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, demo, signOut } = useAuth();
  const { fleets, active, setActiveId } = useFleets();
  const [open, setOpen] = useState(false);
  // Full-bleed views (map, 3D focus, drive replay) own their own padding.
  const bleed = pathname === "/map" || pathname.startsWith("/focus/") || /^\/fleets\/[^/]+\/drives\/[^/]+/.test(pathname);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border bg-surface transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <Logo size={28} wordmark />
        </div>

        {fleets.length > 0 ? (
          <div className="border-b border-border p-3">
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="fleet-switch">Fleet</label>
            <Select id="fleet-switch" value={active?.id ?? ""} onChange={(e) => setActiveId(e.target.value)}>
              {fleets.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                  on ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          {demo ? <Badge tone="primary">Demo data</Badge> : null}
          <div className="truncate text-xs text-muted" title={user?.email}>{user?.email}</div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <LogOutIcon /> {demo ? "Exit demo" : "Sign out"}
          </button>
        </div>
      </aside>

      {open ? <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:hidden">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <MenuIcon />
          </button>
          <Logo size={26} wordmark />
        </header>
        <main className={cn("min-h-0 flex-1", bleed ? "overflow-hidden" : "overflow-y-auto")}>
          {bleed ? children : <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}
