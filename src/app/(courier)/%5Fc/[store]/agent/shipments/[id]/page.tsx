import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShipmentScreen } from "@/features/courier/components/shipment-screen";

export const instant = false;
export const metadata: Metadata = { title: "تفاصيل الشحنة" };

/** `/agent/shipments/[id]` — M38 US-38.3/US-38.4 (T176). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ShipmentScreen id={Number(id)} />;
}
