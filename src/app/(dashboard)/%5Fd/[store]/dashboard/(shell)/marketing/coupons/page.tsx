import type { Metadata } from "next";
import { CouponsScreen } from "@/features/marketing/components/coupons-screen";

export const metadata: Metadata = { title: "الكوبونات", robots: { index: false, follow: false } };

/** `/dashboard/marketing/coupons` — M13 US-13.2.1 (T102). */
export default function Page() {
  return <CouponsScreen />;
}
