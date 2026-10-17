import { DashboardPreview } from "@/features/landing/components/dashboard-preview";
import { HeroIntro } from "@/features/landing/components/hero-intro";

/**
 * Hero Section — Shopify-inspired conversion centerpiece & Glassmorphism Dashboard Mockup.
 *
 * Layered depth back-to-front:
 * 1. Expansive pure-white canvas with a Subtle Grid Pattern (`hero-grid`) + masked `dot-field`.
 * 2. Soft Radial Glow (`brand-aura` + central emerald radial pool) illuminating the store form.
 * 3. Monumental typography + massive store creation form (`<HeroIntro />`).
 * 4. Floating Glassmorphism Dashboard Mockup (`<DashboardPreview />`) rising smoothly with Framer Motion.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-background pb-28 md:pb-40">
      {/* Layer 1 — Subtle architectural grid pattern + masked dot matrix */}
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-30" />
      <div aria-hidden className="dot-field pointer-events-none absolute inset-0 -z-30" />

      {/* Layer 2 — Soft Radial Glow (emerald & cyan ambient light wash) */}
      <div
        aria-hidden
        className="brand-aura pointer-events-none absolute inset-x-0 -top-24 -z-20 h-[42rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-32 -z-20 mx-auto h-96 max-w-4xl rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15"
      />

      {/* Layer 3 — Central Shopify-inspired Store Creation Stack */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 sm:pt-24 md:pt-28">
        <HeroIntro />
      </div>

      {/* Layer 4 — Floating Glassmorphism Dashboard Mockup */}
      <div className="mt-16 sm:mt-20 md:mt-24">
        <DashboardPreview />
      </div>
    </section>
  );
}

