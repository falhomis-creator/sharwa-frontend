import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderPrint } from "@/features/orders/components/order-print";

export const instant = false;

export const metadata: Metadata = { title: "طباعة البوليصة", robots: { index: false, follow: false } };

/** `/dashboard/orders/[id]/print` — waybill / invoice in an RTL print layout (FR-06.10, `order_waybill`). */
export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <OrderPrint orderId={Number(id)} />;
}
