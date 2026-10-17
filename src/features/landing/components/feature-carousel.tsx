"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { ArrowRightLeft, CreditCard, MessageCircle, Zap, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { features, type FeatureIcon } from "@/features/landing/original.content";

const INTERVAL_MS = 4000;

/**
 * One glyph per card, all painted the same accent green.
 *
 * The template used emoji here (⚡ 💱 📲 💳). Emoji carry their own fixed
 * colors — four different ones — and no CSS can bring them into a palette,
 * which is why they are lucide glyphs now (owner direction 2026-10-17: every
 * card icon is a single color).
 */
const ICONS: Record<FeatureIcon, LucideIcon> = {
  instant: Zap,
  currency: ArrowRightLeft,
  whatsapp: MessageCircle,
  payment: CreditCard,
};

/**
 * The hero's second column: the template's four `.feature-card`s as an
 * auto-playing carousel.
 *
 * Built on `motion/react` rather than shadcn's carousel: that primitive wraps
 * embla, which is not a dependency here, and this needs exactly one behaviour
 * — advance, wrap, pause. `LazyMotion` + `m` ship the DOM feature subset.
 *
 * Direction is RTL-aware without any physical CSS: the track reads right to
 * left, so the NEXT card lives to the start-ward left and enters from -x while
 * the outgoing one leaves to +x. Advancing backwards mirrors both.
 *
 * Autoplay stops on hover and on keyboard focus, and `useReducedMotion` turns
 * the whole thing into a static card with working dots — the cards are
 * content, so they must never depend on motion to be reachable.
 */
export function FeatureCarousel() {
  const reduced = useReducedMotion();
  const [{ index, direction }, setSlide] = useState({ index: 0, direction: 1 });
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number, dir: number) => {
    setSlide({ index: (next + features.length) % features.length, direction: dir });
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(
      () => setSlide((s) => ({ index: (s.index + 1) % features.length, direction: 1 })),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced, paused]);

  const feature = features[index]!;
  const Icon = ICONS[feature.icon];
  const offset = 48 * direction;

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        className="flex w-full flex-col gap-5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          aria-live="polite"
          aria-atomic
          className="relative min-h-[17rem] w-full sm:min-h-[16rem]"
        >
          <AnimatePresence initial={false} mode="wait">
            <m.article
              key={feature.title}
              initial={reduced ? false : { opacity: 0, x: -offset }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: offset }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-zinc-200/60 bg-white p-7 shadow-sm sm:p-9"
            >
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-emerald-600/8">
                <Icon className="size-7 text-emerald-600" aria-hidden />
              </span>
              <h2 className="sharwa-ink text-xl font-extrabold sm:text-[1.4rem]">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-[1.75] text-zinc-500 sm:text-base">
                {feature.body}
              </p>
            </m.article>
          </AnimatePresence>
        </div>

        <div role="tablist" aria-label="مزايا المنصة" className="flex items-center justify-center">
          {features.map((item, i) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.title}
              onClick={() => go(i, i > index ? 1 : -1)}
              className="flex size-11 items-center justify-center"
            >
              <span
                aria-hidden
                className={
                  i === index
                    ? "block h-1.5 w-6 rounded-full bg-emerald-600 transition-all duration-200"
                    : "block size-1.5 rounded-full bg-zinc-300 transition-all duration-200"
                }
              />
            </button>
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}
