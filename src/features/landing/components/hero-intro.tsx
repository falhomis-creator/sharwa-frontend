"use client";

import Link from "next/link";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { StartForm } from "@/features/landing/components/start-form";
import { hero } from "@/features/landing/landing.content";

/**
 * The hero's copy & conversion stack, animated with `motion/react` (Framer Motion).
 *
 * Places the massive Shopify-inspired store creation form right at the visual
 * focal center, backed by a soft emerald radial glow and framed by generous
 * high-contrast whitespace.
 */
const stack = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const step = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const TRUST_PILLS = [
  "إعداد فوري خلال 54 ثانية",
  "بلا بطاقة بنكية",
  "نطاق خاص ومحفظة مدمجة",
] as const;

export function HeroIntro() {
  const reduced = useReducedMotion();
  const [before, after] = hero.title.split(hero.titleAccent);

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        variants={stack}
        initial={reduced ? "show" : "hidden"}
        animate="show"
        className="flex flex-col items-center text-center"
      >
        {/* Eyebrow pill */}
        <m.div
          variants={step}
          className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5 text-xs font-medium text-emerald-800 shadow-xs backdrop-blur-md sm:text-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <span>{hero.eyebrow}</span>
        </m.div>

        {/* Monumental headline */}
        <m.h1
          variants={step}
          className="max-w-4xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-6xl md:text-[4.2rem] md:leading-[1.12]"
        >
          {before}
          <span className="text-brand-gradient">{hero.titleAccent}</span>
          {after}
        </m.h1>

        {/* Subtitle */}
        <m.p
          variants={step}
          className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
        >
          {hero.subtitle}
        </m.p>

        {/* Massive central store creation form with Soft Radial Glow */}
        <m.div variants={step} className="relative mt-10 w-full max-w-3xl md:mt-12">
          <div
            aria-hidden
            className="start-glow pointer-events-none absolute -inset-x-12 -inset-y-16 -z-10 sm:-inset-x-28 sm:-inset-y-24"
          />
          <StartForm />
        </m.div>

        {/* Reassuring micro-signals + merchant login */}
        <m.div
          variants={step}
          className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2"
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            {TRUST_PILLS.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <span aria-hidden className="hidden h-4 w-px bg-border sm:inline-block" />

          <p className="text-sm text-muted-foreground">
            {hero.loginPrompt}{" "}
            <Link
              href="/login"
              className="group inline-flex items-center gap-1 font-semibold text-foreground underline decoration-emerald-500/40 underline-offset-4 transition-colors hover:text-emerald-700 hover:decoration-emerald-500 dark:hover:text-emerald-300"
            >
              {hero.ctaLogin}
              <ArrowLeft
                className="size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
                aria-hidden
              />
            </Link>
          </p>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}

