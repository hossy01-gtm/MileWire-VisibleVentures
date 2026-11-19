"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades content up as it scrolls into view. Content is visible on the server
 * and for anyone without JavaScript; only elements below the fold are armed
 * after hydration, so nothing flashes. Honours prefers-reduced-motion.
 * Above-the-fold content uses the CSS-only `.rise` class instead.
 */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.classList.add("reveal-armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.remove("reveal-armed");
        io.disconnect();
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
