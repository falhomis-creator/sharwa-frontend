import type { Metadata } from "next";
import { OrdersScreen } from "@/features/orders/components/orders-screen";

export const metadata: Metadata = { title: "الطلبات", robots: { index: false, follow: false } };

/** `/dashboard/orders` — M06 US-06.1 (T076). Data is client-fetched through the BFF. */
export default function OrdersPage() {
  return <OrdersScreen />;
}
