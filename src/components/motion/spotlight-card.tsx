"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bento cell with a cursor-following neutral pool and a border that firms up on
 * hover. Replaces the Aceternity "card hover effect" with a token-only version:
 * light moves, color never does.
 */
export function SpotlightCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const track = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el || frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${clientY - rect.top}px`);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <Tag
      ref={ref as never}
      onPointerMove={(e: React.PointerEvent) => track(e.clientX, e.clientY)}
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-elevated shadow-sm shadow-zinc-900/5",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-1 hover:border-emerald-500/35 hover:shadow-xl hover:shadow-emerald-500/10",
        className,
      )}
    >
      <div
        aria-hidden
        className="ambient-pool pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100"
      />
      {children}
    </Tag>
  );
}
