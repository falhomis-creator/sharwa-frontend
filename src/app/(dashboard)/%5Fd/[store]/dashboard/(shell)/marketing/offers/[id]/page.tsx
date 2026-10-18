import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferFormScreen } from "@/features/marketing/components/offer-form";

export const instant = false;
export const metadata: Metadata = { title: "تعديل العرض", robots: { index: false, follow: false } };

/** `/dashboard/marketing/offers/[id]` — M13 US-13.2.2 (T102). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <OfferFormScreen id={Number(id)} />;
}
