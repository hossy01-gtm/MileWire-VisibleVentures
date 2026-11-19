import { siteCopy } from "@/lib/site-copy";
import { Logo } from "../Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo size={28} wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{siteCopy.footer.tagline}</p>
        </div>
        <div>
          <h3 className="site-eyebrow">Product</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {siteCopy.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-muted transition-colors hover:text-foreground">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="site-eyebrow">Console</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={siteCopy.consoleHref} className="text-muted transition-colors hover:text-foreground">
                Open the console
              </a>
            </li>
            <li>
              <a href="/login" className="text-muted transition-colors hover:text-foreground">
                Sign in
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-xs text-subtle">© 2026 MileWire. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
