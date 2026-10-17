import { DashboardPreview } from "@/features/landing/components/dashboard-preview";
import { HeroIntro } from "@/features/landing/components/hero-intro";

/**
 * Hero (T034, refactored under constitution I-أ v2.0.0 — owner direction
 * 2026-10-17: "clean, interactive, focused on starting and signing in").
 *
 * The fold now carries exactly four things: the headline, one line of
 * subtitle, the start field, and the merchant sign-in link — then the
 * dashboard floats up beneath them. The eyebrow pill, the secondary "see the
 * capabilities" button and the proof figures were all competing with the
 * field for the same glance; the figures moved below the fold (they are still
 * on the page), the other two are gone.
 *
 * Depth is layered back to front: a masked dot field, a much-softened brand
 * aura, the copy with its own glow, then the glass dashboard.
 *
 * This stays a server component. Only `<HeroIntro>` is client — the mockup
 * holds the LCP node and must not wait on hydration to paint.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-24 md:pb-32">
      {/* layer 1 — dot field under a radial light mask */}
      <div aria-hidden className="dot-field pointer-events-none absolute inset-0 -z-30" />
      {/* layer 2 — brand aura, now a wash rather than a flood */}
      <div
        aria-hidden
        className="brand-aura pointer-events-none absolute inset-x-0 -top-28 -z-20 h-[30rem]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 pt-16 md:pt-24">
        <HeroIntro />
      </div>

      {/* the floating glass dashboard, directly under the field */}
      <div className="mt-16 md:mt-20">
        <DashboardPreview />
      </div>
    </section>
  );
}
