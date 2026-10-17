"use client";

import { m, useReducedMotion } from "motion/react";
import { Bell, PackageCheck, TrendingUp } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";

/**
 * Live-signal badges orbiting the hero mockup (constitution I-أ): the platform
 * should read as something already running, not a static picture.
 *
 * Each badge enters with `motion/react` (the package framer-motion was renamed
 * to) and then drifts on a CSS loop, so the idle animation costs no JS frames.
 * `useReducedMotion` drops both the entrance and the drift.
 *
 * Uses the lightweight `m` component; the `LazyMotion`/`domAnimation` provider
 * is supplied by `<MockupReveal>`, which wraps this subtree.
 */
const BADGES = [
  {
    icon: Bell,
    title: "طلب جديد",
    value: "SH-10493",
    mono: true,
    // RTL-safe logical insets only (constitution II). Negative values push the
    // badge clear of the frame; only applied from lg, where there is room.
    position: "-top-4 end-2 lg:-top-6 lg:end-[-9%]",
    drift: "drift",
    delay: 0.3,
  },
  {
    icon: TrendingUp,
    title: "مبيعات اليوم",
    value: "%18+",
    mono: true,
    position: "top-[42%] start-2 lg:start-[-9%]",
    drift: "drift-slow",
    delay: 0.4,
  },
  {
    icon: PackageCheck,
    title: "شُحنت اليوم",
    value: "24 طلباً",
    mono: false,
    position: "-bottom-5 end-[12%] lg:end-[-6%]",
    drift: "drift-slowest",
    delay: 0.5,
  },
] as const;

export function FloatingBadges() {
  const reduced = useReducedMotion();

  return (
    <>
      {BADGES.map((badge) => {
        const Icon = badge.icon;
        const content = (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-background px-4 py-3 shadow-xl shadow-emerald-500/15">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[0.7rem] text-muted-foreground">{badge.title}</span>
              {badge.mono ? (
                <Mono className="text-[0.8rem] font-semibold text-foreground">{badge.value}</Mono>
              ) : (
                <span className="text-[0.8rem] font-semibold text-foreground">{badge.value}</span>
              )}
            </span>
          </div>
        );

        if (reduced) {
          return (
            <div
              key={badge.title}
              aria-hidden
              className={cn("pointer-events-none absolute z-20 hidden lg:block", badge.position)}
            >
              {content}
            </div>
          );
        }

        return (
          <m.div
            key={badge.title}
            aria-hidden
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, delay: badge.delay, ease: [0.16, 1, 0.3, 1] }}
            className={cn("pointer-events-none absolute z-20 hidden lg:block", badge.position)}
          >
            <div className={badge.drift}>{content}</div>
          </m.div>
        );
      })}
    </>
  );
}
