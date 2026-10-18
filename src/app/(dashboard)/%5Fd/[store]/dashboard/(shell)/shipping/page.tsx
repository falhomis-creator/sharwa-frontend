import type { Metadata } from "next";
import { ShippingSettingsScreen } from "@/features/shipping/components/settings-screen";

export const metadata: Metadata = { title: "الشحن والتوصيل", robots: { index: false, follow: false } };

/** `/dashboard/shipping` — M15 (T109). */
export default function ShippingPage() {
  return <ShippingSettingsScreen />;
}
