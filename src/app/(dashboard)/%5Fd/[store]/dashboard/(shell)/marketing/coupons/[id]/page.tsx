import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CouponFormScreen } from "@/features/marketing/components/coupon-form";

export const instant = false;
export const metadata: Metadata = { title: "تعديل الكوبون", robots: { index: false, follow: false } };

/** `/dashboard/marketing/coupons/[id]` — M13 US-13.2.1 (T102). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <CouponFormScreen id={Number(id)} />;
}
