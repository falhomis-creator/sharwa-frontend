import type { Metadata } from "next";
import { NewPoScreen } from "@/features/procurement/components/new-po-screen";

export const metadata: Metadata = { title: "أمر شراء جديد", robots: { index: false, follow: false } };

/** `/dashboard/purchase-orders/new` — M23 US-23.2 (T149). */
export default function NewPurchaseOrderPage() {
  return <NewPoScreen />;
}
