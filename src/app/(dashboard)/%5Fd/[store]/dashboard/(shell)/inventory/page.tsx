import type { Metadata } from "next";
import { InventoryScreen } from "@/features/inventory/components/inventory-screen";

export const metadata: Metadata = { title: "المخزون", robots: { index: false, follow: false } };

/** `/dashboard/inventory` — M21 US-21.1/21.2/21.4 (T118). Data is client-fetched through the BFF. */
export default function InventoryPage() {
  return <InventoryScreen />;
}
