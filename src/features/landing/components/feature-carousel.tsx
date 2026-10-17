"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MessageCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { features, type FeatureIcon } from "@/features/landing/original.content";

const INTERVAL_MS = 4000;

/**
 * One glyph per card, all painted the same accent green.
 *
 * The template used emoji here. Emoji carry their own fixed colors — four
 * different ones — and no CSS can bring them into a palette, which is why
 * these are lucide glyphs.
 */
const ICONS: Record<FeatureIcon, LucideIcon> = {
  instant: Zap,
  currency: ArrowRightLeft,
  whatsapp: MessageCircle,
  payment: CreditCard,
};

/**
 * The hero's second column: the template's four feature cards as an
 * auto-playing carousel, with arrows and pagination dots.
 *
 * Built on `motion/react` rather than shadcn's carousel: that primitive wraps
 * embla, which is not a dependency here, and this needs exactly one behaviour
 * — advance, wrap, hold. `LazyMotion` + `m` ship the DOM feature subset.
 *
 * Autoplay no longer pauses when the pointer is over the CARD. It did, and
 * that is what made the slider look frozen: a reader's cursor comes to rest on
 * the thing they are reading, and the carousel stopped for as long as it sat
 * there. WCAG 2.2.2 still wants a way to stop auto-updating content, so the
 * hold moved onto the controls — hovering the arrows or dots freezes the
 * current card while you aim at them, and keyboard focus does the same. The
 * card itself never stops the show.
 *
 * Direction is RTL-aware without any physical CSS: the track reads right to
 * left, so the NEXT card lives to the start-ward left and enters from -x while
 * the outgoing one leaves to +x. Going back mirrors both.
 *
 * Under `prefers-reduced-motion` it keeps advancing — the cards are content,
 * and stopping leaves three of the four unreachable unless the reader finds
 * the dots — but it crossfades in place instead of sliding.
 */
export function FeatureCarousel() {
  const reduced = useReducedMotion();
  const [{ index, direction }, setSlide] = useState({ index: 0, direction: 1 });
  const [held, setHeld] = useState(false);

  const go = useCallback((next: number, dir: number) => {
    setSlide({ index: (next + features.length) % features.length, direction: dir });
  }, []);

  useEffect(() => {
    if (held) return;
    const id = window.setInterval(
      () => setSlide((s) => ({ index: (s.index + 1) % features.length, direction: 1 })),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [held]);

  const feature = features[index]!;
  const Icon = ICONS[feature.icon];
  const offset = reduced ? 0 : 48 * direction;

  const arrowClass =
    "flex size-11 items-center justify-center rounded-full border border-white/30 bg-transparent text-white transition-colors hover:bg-white/10";

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex w-full flex-col gap-5">
        <div
          aria-live="polite"
          aria-atomic
          className="relative min-h-[17rem] w-full sm:min-h-[16rem]"
        >
          <AnimatePresence initial={false} mode="wait">
            <m.article
              key={feature.title}
              initial={{ opacity: 0, x: -offset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: offset }}
              transition={{ duration: reduced ? 0.25 : 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col justify-center rounded-[1.5rem] border border-white/10 bg-white/5 p-7 backdrop-blur-xl sm:p-9"
            >
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-orange-500">
                <Icon className="size-7 text-white" aria-hidden />
              </span>
              <h2 className="text-xl font-extrabold text-white sm:text-[1.4rem]">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-[1.75] text-zinc-400 sm:text-base">
                {feature.body}
              </p>
            </m.article>
          </AnimatePresence>
        </div>

        {/* Controls. Hovering or focusing anywhere in this row holds the
            current card — the pause mechanism WCAG 2.2.2 asks for. */}
        <div
          className="flex items-center justify-center gap-1"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
        >
          {/* In RTL the previous card sits to the right, so this chevron points
              right. Both arrows are literal directions, not mirrored icons. */}
          <button
            type="button"
            onClick={() => go(index - 1, -1)}
            aria-label="البطاقة السابقة"
            className={arrowClass}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div role="tablist" aria-label="مزايا المنصة" className="flex items-center">
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
                      ? "block h-1.5 w-6 rounded-full bg-orange-500 transition-all duration-200"
                      : "block size-1.5 rounded-full bg-white/30 transition-all duration-200"
                  }
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index + 1, 1)}
            aria-label="البطاقة التالية"
            className={arrowClass}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </LazyMotion>
  );
}
