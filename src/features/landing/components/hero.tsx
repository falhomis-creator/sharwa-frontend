import Link from "next/link";
import { FeatureCarousel } from "@/features/landing/components/feature-carousel";
import { hero } from "@/features/landing/original.content";

/**
 * Split-screen hero: the original template's copy block on the reading side,
 * its four feature cards opposite as a carousel.
 *
 * Layout and element order are untouched. Color is down to three things — ink
 * for the type, one green for the badge and the action, and one blue for the
 * brand word. The template's teal→indigo headline gradient and the CTA's
 * colored glow are gone; the action carries a plain neutral `shadow-sm`.
 */
export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col justify-center px-6 py-14 sm:px-8 md:py-20 lg:min-h-[calc(100dvh-4.5rem)] lg:py-16">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
        <div className="flex flex-col items-start text-start">
          <span className="inline-flex items-center rounded-full border border-emerald-600/20 bg-emerald-600/10 px-[18px] py-1.5 text-[13px] font-extrabold text-emerald-700">
            {hero.badge}
          </span>

          <h1 className="sharwa-ink mt-5 text-[2rem] leading-[1.35] font-black sm:text-[2.6rem] lg:text-[2.9rem]">
            {hero.titleLine1}
            <br />
            {hero.titleLine2Before}
            <span className="text-blue-600">{hero.titleAccent}</span>
            {hero.titleLine2After}
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-[1.8] text-zinc-500 sm:text-[17px]">
            {hero.subtitle}
          </p>

          <Link
            href="/register"
            className="mt-9 inline-flex min-h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-[14px] bg-emerald-600 px-9 text-[17px] font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:w-auto"
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
    </section>
  );
}
