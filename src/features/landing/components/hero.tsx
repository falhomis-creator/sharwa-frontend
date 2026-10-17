import { ArrowLeft, Sparkle } from "lucide-react";
import { DashboardPreview } from "@/features/landing/components/dashboard-preview";
import { ProofBar } from "@/features/landing/components/proof-bar";
import { StartForm } from "@/features/landing/components/start-form";
import { hero, type ProofStat } from "@/features/landing/landing.content";

/**
 * Hero (T034, rebuilt under constitution I-أ v2.0.0).
 *
 * Depth is layered back to front: a masked dot field, a blurred emerald→cyan
 * aura, the copy, then the glass dashboard floating over its own brand glow
 * with live badges around it. The headline keywords carry the brand gradient;
 * the primary action is emerald with a matching glow and a hover lift.
 *
 * Everything that hides content is load-driven and above the fold, so the page
 * is still readable the moment HTML lands (the constitution's one surviving
 * motion rule).
 */
export function Hero({ stats }: { stats: ProofStat[] }) {
  const [before, after] = hero.title.split(hero.titleAccent);

  return (
    <section className="relative isolate overflow-hidden pb-20 md:pb-28">
      {/* layer 1 — dot field under a radial light mask */}
      <div aria-hidden className="dot-field pointer-events-none absolute inset-0 -z-30" />
      {/* layer 2 — brand aura */}
      <div
        aria-hidden
        className="brand-aura pointer-events-none absolute inset-x-0 -top-24 -z-20 h-[32rem]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 pt-14 md:pt-20">
        <div className="flex flex-col items-center text-center">
          <span className="enter-up inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkle className="size-3.5" aria-hidden />
            {hero.eyebrow}
          </span>

          <h1
            style={{ animationDelay: "60ms" }}
            className="enter-up mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl md:leading-[1.15]"
          >
            {before}
            <span className="text-brand-gradient">{hero.titleAccent}</span>
            {after}
          </h1>

          <p
            style={{ animationDelay: "120ms" }}
            className="enter-up mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {hero.subtitle}
          </p>

          <StartForm
            style={{ animationDelay: "180ms" }}
            className="enter-up mt-8 flex flex-col items-center"
          />

          <a
            href="#capabilities"
            style={{ animationDelay: "240ms" }}
            className="enter-up group mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-4 text-sm font-medium text-foreground transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            {hero.ctaSecondary}
            <ArrowLeft
              className="size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1"
              aria-hidden
            />
          </a>
        </div>
      </div>

      {/* the floating glass dashboard, directly under the copy */}
      <div className="mt-12 md:mt-16">
        <DashboardPreview />
      </div>

      <div className="mx-auto mt-16 w-full max-w-6xl px-6 md:mt-24">
        <ProofBar stats={stats} />
      </div>
    </section>
  );
}
