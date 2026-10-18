import type { Metadata } from "next";
import { LocationsSection } from "@/features/settings/components/explicit-sections";

export const metadata: Metadata = { title: "الإعدادات — المواقع", robots: { index: false, follow: false } };

/** `/dashboard/settings/locations` — M34 (explicit save). */
export default function SettingsLocationsSectionPage() {
  return <LocationsSection />;
}
