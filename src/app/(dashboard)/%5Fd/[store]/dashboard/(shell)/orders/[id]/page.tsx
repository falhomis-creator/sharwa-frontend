import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderPage } from "@/features/orders/components/order-page";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل الطلب", robots: { index: false, follow: false } };

/** `/dashboard/orders/[id]` — the full-page detail (FR-06.08), same component as the sheet. */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <OrderPage orderId={Number(id)} />;
}
