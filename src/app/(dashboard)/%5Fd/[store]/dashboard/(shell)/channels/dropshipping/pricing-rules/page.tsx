import type { Metadata } from "next";
import { PricingRulesScreen } from "@/features/dropshipping/components/pricing-rules-screen";

export const metadata: Metadata = { title: "قواعد التسعير", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping/pricing-rules` — M29 (T161). */
export default function Page() {
  return <PricingRulesScreen />;
}
