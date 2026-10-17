import type { Metadata } from "next";
import { Hero } from "@/features/landing/components/hero";
import { seo } from "@/features/landing/original.content";

export function generateMetadata(): Metadata {
  return { title: seo.title, description: seo.description };
}

/**
 * The landing page is the hero and nothing else (owner direction 2026-10-17:
 * "build this layout only — no FAQ, no complex footer, no plans").
 *
 * The capabilities bento, how-it-works, pricing and FAQ sections still exist
 * under `features/landing/components/`; they are simply not mounted. Nothing
 * was deleted, so re-adding any of them is a one-line change here.
 */
export default function LandingPage() {
  return <Hero />;
}
