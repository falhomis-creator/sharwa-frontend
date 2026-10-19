import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShipmentDetailScreen } from "@/features/shipping/sharwa-ship/components/shipment-detail";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل البوليصة", robots: { index: false, follow: false } };

/** `/dashboard/shipping/sharwa-ship/[id]` — M39 US-39.3 (T179). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ShipmentDetailScreen id={Number(id)} />;
}
