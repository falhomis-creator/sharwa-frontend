import type { Metadata } from "next";
import { AnnouncementSection } from "@/features/settings/components/auto-sections";

export const metadata: Metadata = { title: "الإعدادات — شريط الإعلانات", robots: { index: false, follow: false } };

/** `/dashboard/settings/announcement` — M34 (auto save). */
export default function SettingsAnnouncementSectionPage() {
  return <AnnouncementSection />;
}
