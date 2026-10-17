"use client";

import { m, useReducedMotion } from "motion/react";
import { Bell, TrendingUp, Wallet } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";

/**
 * Live-signal badges orbiting the hero glassmorphism dashboard mockup.
 *
 * Each badge enters with `motion/react` (Framer Motion) and drifts smoothly
 * on a CSS loop.
 */
const BADGES = [
  {
    icon: Bell,
    title: "طلب جديد · مدفوع",
    value: "SH-10493 · 640 ر.س",
    mono: true,
    position: "-top-5 end-4 xl:-top-6 xl:-end-10",
    drift: "drift",
    delay: 0.35,
  },
  {
    icon: TrendingUp,
    title: "نمو مبيعات اليوم",
    value: "+18.4%",
    mono: true,
    position: "top-[44%] -start-2 xl:-start-12",
    drift: "drift-slow",
    delay: 0.45,
  },
  {
    icon: Wallet,
    title: "تسوية شروة باي",
    value: "24,860 ر.س",
    mono: true,
    position: "-bottom-5 end-6 xl:-bottom-6 xl:-end-10",
    drift: "drift-slowest",
    delay: 0.55,
  },
] as const;

export function FloatingBadges() {
  const reduced = useReducedMotion();

  return (
    <>
      {BADGES.map((badge) => {
        const Icon = badge.icon;
        const content = (
          <div className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/80 px-4 py-3 shadow-2xl shadow-emerald-600/15 backdrop-blur-2xl dark:border-white/15 dark:bg-zinc-900/80">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[0.7rem] font-medium text-muted-foreground">{badge.title}</span>
              {badge.mono ? (
                <Mono className="mt-0.5 text-xs font-bold text-foreground">{badge.value}</Mono>
              ) : (
                <span className="mt-0.5 text-xs font-bold text-foreground">{badge.value}</span>
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
            initial={{ opacity: 0, scale: 0.9, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, delay: badge.delay, ease: [0.16, 1, 0.3, 1] }}
            className={cn("pointer-events-none absolute z-20 hidden lg:block", badge.position)}
          >
            <div className={badge.drift}>{content}</div>
          </m.div>
        );
      })}
    </>
  );
}

