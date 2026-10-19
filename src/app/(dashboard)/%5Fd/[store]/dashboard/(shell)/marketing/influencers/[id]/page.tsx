import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerDetailScreen } from "@/features/affiliates/components/partner-detail";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل المؤثر", robots: { index: false, follow: false } };

/** `/dashboard/marketing/influencers/[id]` — M17 §6: code/link, coupons, sales and settlement (T146). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <PartnerDetailScreen kind="influencers" id={Number(id)} />;
}
