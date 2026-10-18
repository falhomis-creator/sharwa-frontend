import type { Metadata } from "next";
import { OfferFormScreen } from "@/features/marketing/components/offer-form";

export const metadata: Metadata = { title: "عرض جديد", robots: { index: false, follow: false } };

/** `/dashboard/marketing/offers/new` — M13 US-13.2.2 (T102). */
export default function Page() {
  return <OfferFormScreen id={null} />;
}
