import type { Metadata } from "next";
import { DeliveryMethodsScreen } from "@/features/shipping/components/settings-screen";

export const metadata: Metadata = { title: "طرق التوصيل", robots: { index: false, follow: false } };

/** `/dashboard/shipping/delivery-methods` — M15 (T109). */
export default function Page() {
  return <DeliveryMethodsScreen />;
}
