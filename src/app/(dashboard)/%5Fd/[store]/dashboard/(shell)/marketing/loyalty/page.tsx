import type { Metadata } from "next";
import { LoyaltyScreen } from "@/features/marketing/components/loyalty-screen";

export const metadata: Metadata = { title: "نقاط الولاء", robots: { index: false, follow: false } };

/** `/dashboard/marketing/loyalty` — M13 US-13.6.1 (T104). */
export default function Page() {
  return <LoyaltyScreen />;
}
