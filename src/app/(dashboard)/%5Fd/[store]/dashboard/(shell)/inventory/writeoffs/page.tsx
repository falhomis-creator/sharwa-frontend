import type { Metadata } from "next";
import { WriteoffsScreen } from "@/features/inventory/components/writeoffs-screen";

export const metadata: Metadata = { title: "طلبات الإعدام", robots: { index: false, follow: false } };

/** `/dashboard/inventory/writeoffs` — M21 US-21.7 (T118). Data is client-fetched through the BFF. */
export default function InventoryWriteoffsPage() {
  return <WriteoffsScreen />;
}
