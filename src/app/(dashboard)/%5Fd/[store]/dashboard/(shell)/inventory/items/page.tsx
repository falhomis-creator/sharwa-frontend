import type { Metadata } from "next";
import { ItemsScreen } from "@/features/inventory/components/items-screen";

export const metadata: Metadata = { title: "الوحدات المسلسلة", robots: { index: false, follow: false } };

/** `/dashboard/inventory/items` — M21 US-21.5 (T118). Data is client-fetched through the BFF. */
export default function InventoryItemsPage() {
  return <ItemsScreen />;
}
