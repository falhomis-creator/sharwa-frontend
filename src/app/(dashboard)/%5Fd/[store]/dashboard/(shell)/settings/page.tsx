import type { Metadata } from "next";
import { SettingsIndex } from "@/features/settings/components/settings-index";

export const metadata: Metadata = { title: "الإعدادات", robots: { index: false, follow: false } };

/** `/dashboard/settings` — the hub index (T084). */
export default function SettingsPage() {
  return <SettingsIndex />;
}
