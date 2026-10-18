import type { Metadata } from "next";
import { NewOrderScreen } from "@/features/orders/components/new-order-screen";

export const metadata: Metadata = { title: "طلب يدوي", robots: { index: false, follow: false } };

/** `/dashboard/orders/new` — M06 US-06.6 (T078): phone order / B2B draft. */
export default function NewOrderPage() {
  return <NewOrderScreen />;
}
