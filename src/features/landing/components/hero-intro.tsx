"use client";

import Link from "next/link";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { StartForm } from "@/features/landing/components/start-form";
import { hero } from "@/features/landing/landing.content";

/**
 * The hero's copy stack, entering under `motion/react` (the package
 * framer-motion was renamed to; `m` + `LazyMotion` ship the DOM subset rather
 * than the full bundle).
 *
 * Everything here is text and one input — cheap to hydrate — so a JS-driven
 * entrance is affordable. The dashboard mockup below is NOT in this tree: it
 * holds the page's LCP node and keeps its CSS rise, which starts at first
 * paint instead of waiting on hydration (measured 1.6s vs 4.8s LCP on the
 * mobile preset).
 *
 * `useReducedMotion` starts the stack at its end state rather than animating
 * it, so the content is identical and simply does not move (constitution I).
 */
const stack = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.04 } },
};

const step = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

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
        <m.h1
          variants={step}
          className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-[3.4rem] md:leading-[1.14]"
        >
          {before}
          <span className="text-brand-gradient">{hero.titleAccent}</span>
          {after}
        </m.h1>

        <m.p
          variants={step}
          className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          {hero.subtitle}
        </m.p>

        {/* The focal point: the field, lit from behind so the eye lands here. */}
        <m.div variants={step} className="relative mt-10 w-full max-w-2xl">
          <div
            aria-hidden
            className="start-glow pointer-events-none absolute -inset-x-24 -inset-y-20 -z-10"
          />
          <StartForm />
        </m.div>

        <m.p variants={step} className="mt-6 text-sm text-muted-foreground">
          {hero.loginPrompt}{" "}
          <Link
            href="/login"
            className="group inline-flex items-center gap-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-emerald-700 hover:decoration-emerald-500/60 dark:hover:text-emerald-300"
          >
            {hero.ctaLogin}
            <ArrowLeft
              className="size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
              aria-hidden
            />
          </Link>
        </m.p>
      </m.div>
    </LazyMotion>
  );
}
