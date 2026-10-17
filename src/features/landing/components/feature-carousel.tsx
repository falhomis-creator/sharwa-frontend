"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { features } from "@/features/landing/original.content";

const INTERVAL_MS = 4000;

/**
 * The hero's second column: the template's four `.feature-card`s turned into
 * an auto-playing carousel (owner direction 2026-10-17).
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
              className="sharwa-card absolute inset-0 flex flex-col justify-center rounded-2xl p-7 sm:p-9"
            >
              <span
                aria-hidden
                className="sharwa-icon-tile mb-5 flex size-16 items-center justify-center rounded-2xl text-[1.7rem]"
              >
                {feature.icon}
              </span>
              <h2 className="sharwa-ink text-xl font-extrabold sm:text-[1.4rem]">{feature.title}</h2>
              <p className="sharwa-muted mt-3 text-sm leading-[1.75] sm:text-base">
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
                data-active={i === index}
                className="sharwa-dot block h-1.5 rounded-full data-[active=false]:w-1.5 data-[active=true]:w-6"
              />
            </button>
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}
