import Link from "next/link";
import { FeatureCarousel } from "@/features/landing/components/feature-carousel";
import { HeroVideo } from "@/features/landing/components/hero-video";
import { hero } from "@/features/landing/original.content";

/**
 * Split-screen hero over a full-bleed background video (owner direction
 * 2026-10-17, matching Shopify's current treatment).
 *
 * The two columns, their order and every element inside them are unchanged.
 * Two things were added around them and one thing moved:
 *
 *   - the video and its scrim, as the section's first two children. The
 *     video is a client component: `autoPlay` alone left a black screen
 *     after a refresh, so playback is enforced in an effect, which is also
 *     where `prefers-reduced-motion` is honoured (see `<HeroVideo>`);
 *   - `max-w-7xl` moved OFF the section and onto a new inner wrapper. The
 *     video is `absolute inset-0` and so is bounded by the section, which was
 *     capped at 1280px — it would have been a letterboxed strip down the
 *     middle of a wide display instead of a background. The columns sit at
 *     exactly the same width they did before.
 *
 * The section is pulled up under the header with `-mt-18` and clears it again
 * with `pt-18` (the bar is 4.5rem: a 44px row inside 14px of padding). Without
 * that the video stopped where the header began, and a transparent header over
 * the cream page ground left its white type invisible on cream. Now the footage
 * and its scrim run the full viewport and the bar floats on them.
 *
 * Layering: the section is `isolate`, so it forms a stacking context and the
 * negative z-indices below cannot escape it. Within that context the paint
 * order is the section's own `bg-zinc-950`, then the video (-z-20), then the
 * scrim (-z-10), then the content (z-10). The black ground matters: it is
 * what the white type sits on for the moment before the first frame decodes,
 * and what it would sit on if the file were ever missing.
 */
export function Hero() {
  return (
    <section className="relative isolate flex w-full flex-col justify-center overflow-hidden bg-zinc-950 min-h-dvh py-14 pt-18 md:py-20 md:pt-24 lg:py-16 lg:pt-24 -mt-18">
      <HeroVideo
        src="/hero-video.mp4"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />

      {/* Scrim. Holds the white type legible over any frame of any clip. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-zinc-950/55" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          <div className="flex flex-col items-start text-start">
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-[18px] py-1.5 text-[13px] font-extrabold text-emerald-200 backdrop-blur-sm">
              {hero.badge}
            </span>

            <h1 className="mt-5 text-[2rem] leading-[1.35] font-black text-white sm:text-[2.6rem] lg:text-[2.9rem]">
              {hero.titleLine1}
              <br />
              {hero.titleLine2Before}
              <span className="text-orange-500">{hero.titleAccent}</span>
              {hero.titleLine2After}
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-[1.8] text-zinc-300 sm:text-[17px]">
              {hero.subtitle}
            </p>

            <Link
              href="/register"
              className="mt-9 inline-flex min-h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-[14px] bg-orange-500 px-9 text-[17px] font-extrabold text-white shadow-lg shadow-orange-500/40 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/50 sm:w-auto"
            >
              <span>{hero.cta}</span>
              {/* The template's own arrow. It points along the reading direction,
                  so it is a literal character, not a mirrored icon. */}
              <span aria-hidden>←</span>
            </Link>
          </div>

          <div className="w-full lg:justify-self-end">
            <FeatureCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}
