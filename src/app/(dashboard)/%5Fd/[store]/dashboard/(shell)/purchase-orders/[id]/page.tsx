import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PoPage } from "@/features/procurement/components/po-page";

export const instant = false;
export const metadata: Metadata = { title: "أمر شراء", robots: { index: false, follow: false } };

/** `/dashboard/purchase-orders/[id]` — M23 US-23.2…23.4 (T149): detail + timeline. */
export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <PoPage poId={Number(id)} />;
}
