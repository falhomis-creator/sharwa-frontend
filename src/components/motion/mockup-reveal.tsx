"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hero mockup wrapper with smooth upward Framer Motion (`motion/react`) reveal.
 *
 * Supplies the `LazyMotion`/`domAnimation` provider for the dashboard mockup
 * and its orbiting live-signal badges, rising smoothly into place on load
 * while respecting `prefers-reduced-motion`.
 */
export function MockupReveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        initial={reduced ? false : { opacity: 0, y: 56, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={cn("will-change-transform", className)}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

