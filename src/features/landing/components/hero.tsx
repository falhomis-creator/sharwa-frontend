import Link from "next/link";
import { FeatureCarousel } from "@/features/landing/components/feature-carousel";
import { hero } from "@/features/landing/original.content";

/**
 * Split-screen hero (owner direction 2026-10-17): the original template's
 * centred copy block and its four feature cards, re-laid as two columns on
 * `lg` — copy on the reading side, the card carousel opposite.
 *
 * The copy itself is the template's, unchanged: badge, the two headline lines
 * split exactly where its `<br>` and gradient `<span>` fall, the subtitle, and
 * the single gradient CTA. Nothing has been added around it.
 */
export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col justify-center px-6 py-14 sm:px-8 md:py-20 lg:min-h-[calc(100dvh-4.5rem)] lg:py-16">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
        <div className="flex flex-col items-start text-start">
          <span className="sharwa-badge inline-flex items-center gap-2 rounded-full px-[18px] py-1.5 text-[13px] font-extrabold">
            <span aria-hidden>{hero.badgeGlyph}</span>
            {hero.badge}
          </span>

          <h1 className="sharwa-ink mt-5 text-[2rem] leading-[1.35] font-black sm:text-[2.6rem] lg:text-[2.9rem]">
            {hero.titleLine1}
            <br />
            {hero.titleLine2Before}
            <span className="sharwa-gradient-text">{hero.titleAccent}</span>
            {hero.titleLine2After}
          </h1>

          <p className="sharwa-muted mt-5 max-w-xl text-[15px] leading-[1.8] sm:text-[17px]">
            {hero.subtitle}
          </p>

          <Link
            href="/register"
            className="sharwa-cta mt-9 inline-flex min-h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-[14px] px-9 text-[17px] font-extrabold sm:w-auto"
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
