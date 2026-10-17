import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero } from "@/features/landing/components/hero";
import { CapabilitiesBento } from "@/features/landing/components/capabilities-bento";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { Pricing } from "@/features/landing/components/pricing";
import { PricingSkeleton } from "@/features/landing/components/pricing-skeleton";
import { Faq } from "@/features/landing/components/faq";
import { getProofStats } from "@/features/landing/api/stats";
import { seo } from "@/features/landing/landing.content";

export function generateMetadata(): Metadata {
  return {
    title: seo.title,
    description: seo.description,
  };
}

/** `SoftwareApplication`, escaped so a `<` in any field cannot break out of the script. */
function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "شروه",
    description: seo.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "ar",
    offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function LandingPage() {
  const stats = await getProofStats();

  return (
    <>
      <JsonLd />

      <Hero stats={stats} />

      <div className="py-16 md:py-24">
        <CapabilitiesBento />
      </div>

      <div className="py-16 md:py-24">
        <HowItWorks />
      </div>

      <div className="py-16 md:py-24">
        <Suspense fallback={<PricingSkeleton />}>
          <Pricing />
        </Suspense>
      </div>

      <div className="py-16 md:py-24">
        <Faq />
      </div>
    </>
  );
}
