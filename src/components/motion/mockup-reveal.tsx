"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hero mockup wrapper (constitution I-أ).
 *
 * The rise itself (y 50 → 0) is a CSS animation, NOT framer-motion: this
 * subtree holds the page's LCP element, and a JS-driven transform cannot start
 * until hydration completes — which measured LCP 4.8s on the mobile preset
 * against 1.6s for the CSS equivalent. The two are visually identical.
 *
 * `motion/react` (the package framer-motion was renamed to) still drives the
 * floating badges, which are small, never the LCP element, and genuinely want a
 * JS timeline. This component supplies their `LazyMotion`/`domAnimation`
 * provider — the feature subset rather than the full bundle, and `strict` so a
 * stray `motion.*` import fails loudly instead of pulling the whole library.
 */
export function MockupReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className={cn("rise-in", className)}>{children}</div>
    </LazyMotion>
  );
}
