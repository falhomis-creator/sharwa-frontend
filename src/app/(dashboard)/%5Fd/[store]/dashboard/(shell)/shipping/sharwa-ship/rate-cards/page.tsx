import type { Metadata } from "next";
import { RateCardsScreen } from "@/features/shipping/sharwa-ship/components/ops-screens";

export const metadata: Metadata = { title: "لقطات التسعيرة", robots: { index: false, follow: false } };

/** `/dashboard/shipping/sharwa-ship/rate-cards` — M39 US-39.4 (T179). */
export default function Page() {
  return <RateCardsScreen />;
}
