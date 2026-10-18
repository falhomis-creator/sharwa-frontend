import type { Metadata } from "next";
import { AbandonedSettingsScreen } from "@/features/marketing/components/abandoned-settings-screen";

export const metadata: Metadata = { title: "إعدادات تذكير السلات", robots: { index: false, follow: false } };

/** `/dashboard/marketing/abandoned-carts/settings` — M13 US-13.3.2 (T103). */
export default function Page() {
  return <AbandonedSettingsScreen />;
}
