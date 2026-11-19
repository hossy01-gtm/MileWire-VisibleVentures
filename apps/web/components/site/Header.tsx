"use client";

import Link from "next/link";
import { useState } from "react";
import { siteCopy } from "@/lib/site-copy";
import { Logo } from "../Logo";
import { CloseIcon, MenuIcon } from "./icons";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:h-16">
        <Link href="/" aria-label="MileWire home" onClick={() => setOpen(false)}>
          <Logo size={28} wordmark />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Page sections">
          {siteCopy.nav.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="px-3 py-2 text-sm text-muted transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Open the console
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-9 items-center justify-center border border-border md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="border-t border-border bg-surface md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            {siteCopy.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="py-2.5 text-sm text-muted hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/map"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Open the console
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
