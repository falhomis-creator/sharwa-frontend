import type { Metadata } from "next";
import { OffersScreen } from "@/features/marketing/components/offers-screen";

export const metadata: Metadata = { title: "العروض الترويجية", robots: { index: false, follow: false } };

/** `/dashboard/marketing/offers` — M13 US-13.2.2 (T102). */
export default function Page() {
  return <OffersScreen />;
}
