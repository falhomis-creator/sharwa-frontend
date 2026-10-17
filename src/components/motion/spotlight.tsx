"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pointer-tracked ambient light (hand-built; the Aceternity/Magic UI sources
 * ship raw hex colors and physical-direction classes, both rejected by the
 * ESLint constitution guards).
 *
 * Strictly achromatic: a faint zinc hairline lattice that brightens around the
 * cursor plus one soft neutral pool — no hue, no colored glow (constitution I).
 * Tracking writes CSS custom properties through a ref, so moving the pointer
 * costs zero React renders; `prefers-reduced-motion` drops both layers in CSS.
 */
export function Spotlight({
  children,
  className,
  grid = true,
  pool = true,
}: {
  children?: ReactNode;
  className?: string;
  grid?: boolean;
  pool?: boolean;
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
    <div
      ref={ref}
      onPointerMove={(e) => track(e.clientX, e.clientY)}
      className={cn("relative isolate", className)}
    >
      {grid ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="ambient-grid absolute inset-0" />
          <div className="ambient-grid-reveal absolute inset-0" />
        </div>
      ) : null}
      {pool ? (
        <div aria-hidden className="ambient-pool pointer-events-none absolute inset-0 -z-10" />
      ) : null}
      {children}
    </div>
  );
}
