import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerDetailScreen } from "@/features/affiliates/components/partner-detail";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل المسوّق", robots: { index: false, follow: false } };

/** `/dashboard/marketing/affiliates/[id]` — M17 §6: code/link, coupons, sales and settlement (T146). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <PartnerDetailScreen kind="affiliates" id={Number(id)} />;
}
