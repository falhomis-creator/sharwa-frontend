import type { Metadata } from "next";
import { MovementsScreen } from "@/features/inventory/components/movements-screen";

export const metadata: Metadata = { title: "سجل الحركات", robots: { index: false, follow: false } };

/** `/dashboard/inventory/movements` — M21 US-21.3 (T118). Data is client-fetched through the BFF. */
export default function InventoryMovementsPage() {
  return <MovementsScreen />;
}
