import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierPage } from "@/features/procurement/components/supplier-page";

export const instant = false;
export const metadata: Metadata = { title: "تفاصيل المورد", robots: { index: false, follow: false } };

/** `/dashboard/suppliers/[id]` — M23 US-23.1 (T149). */
export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <SupplierPage supplierId={Number(id)} />;
}
