import type { Metadata } from "next";
import { GiftingScreen } from "@/features/marketing/components/gifting-screen";

export const metadata: Metadata = { title: "الإهداء", robots: { index: false, follow: false } };

/** `/dashboard/marketing/gifting` — M13 US-13.7.1 (T104). */
export default function Page() {
  return <GiftingScreen />;
}
