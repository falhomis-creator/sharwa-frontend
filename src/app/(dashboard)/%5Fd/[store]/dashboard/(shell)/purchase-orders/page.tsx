import type { Metadata } from "next";
import { PurchaseOrdersScreen } from "@/features/procurement/components/purchase-orders-screen";

export const metadata: Metadata = { title: "أوامر الشراء", robots: { index: false, follow: false } };

/** `/dashboard/purchase-orders` — M23 US-23.5 (T149): board / table. */
export default function PurchaseOrdersPage() {
  return <PurchaseOrdersScreen />;
}
