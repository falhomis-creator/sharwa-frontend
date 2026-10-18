import type { Metadata } from "next";
import { CouponFormScreen } from "@/features/marketing/components/coupon-form";

export const metadata: Metadata = { title: "كوبون جديد", robots: { index: false, follow: false } };

/** `/dashboard/marketing/coupons/new` — M13 US-13.2.1 (T102). */
export default function Page() {
  return <CouponFormScreen id={null} />;
}
