import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiveScreen } from "@/features/procurement/components/receive-screen";

export const instant = false;
export const metadata: Metadata = { title: "تسجيل استلام", robots: { index: false, follow: false } };

/** `/dashboard/purchase-orders/[id]/receive` — M23 US-23.4 (T149). */
export default async function ReceivePurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ReceiveScreen poId={Number(id)} />;
}
