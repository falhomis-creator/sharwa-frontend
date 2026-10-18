import type { Metadata } from "next";
import { ShippingSection } from "@/features/settings/components/explicit-sections";

export const metadata: Metadata = { title: "الإعدادات — الشحن", robots: { index: false, follow: false } };

/** `/dashboard/settings/shipping` — M34 (explicit save). */
export default function SettingsShippingSectionPage() {
  return <ShippingSection />;
}
