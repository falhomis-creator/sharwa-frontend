import { ArrowLeft } from "lucide-react";
import { Spotlight } from "@/components/motion/spotlight";
import { AccentWord } from "@/features/landing/components/accent-word";
import { ProofBar } from "@/features/landing/components/proof-bar";
import { StartForm } from "@/features/landing/components/start-form";
import { hero, type ProofStat } from "@/features/landing/landing.content";

/**
 * Hero (T034). Asymmetric 12-column grid — the copy occupies 7 columns from the
 * inline start, and the remaining 5 are deliberately void, marked only by the
 * grid hairline. No illustration, no gradient, no card: the depth comes from the
 * pointer-tracked light in `<Spotlight>` and from restraint.
 */
export function Hero({ stats }: { stats: ProofStat[] }) {
  const [before, after] = hero.title.split(hero.titleAccent);

  return (
    <Spotlight className="border-b border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-12 pt-14 pb-10 md:pt-24 md:pb-16">
          <div className="col-span-12 lg:col-span-7">
            <div className="flex flex-col items-start gap-6">
              <span className="enter-up inline-flex items-center gap-2 rounded-md border border-border/60 bg-elevated/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                <span aria-hidden className="size-1 rounded-full bg-foreground" />
                {hero.eyebrow}
              </span>

              <h1 style={{ animationDelay: "60ms" }} className="enter-up max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl md:leading-[1.1]">
                {before}
                <AccentWord>{hero.titleAccent}</AccentWord>
                {after}
              </h1>

              <p style={{ animationDelay: "120ms" }} className="enter-up max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {hero.subtitle}
              </p>

              <StartForm style={{ animationDelay: "180ms" }} className="enter-up" />

              <a
                href="#capabilities"
                style={{ animationDelay: "240ms" }}
                className="enter-up group inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {hero.ctaSecondary}
                <ArrowLeft
                  className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1"
                  aria-hidden
                />
              </a>
            </div>
          </div>

          {/* The void: 5 columns of air, marked by one grid hairline. */}
          <div
            aria-hidden
            className="hidden lg:col-span-5 lg:block lg:border-s lg:border-border/40"
          />
        </div>

        <ProofBar stats={stats} />
      </div>
    </Spotlight>
  );
}
