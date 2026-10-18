import type { Metadata } from "next";
import { ContactSection } from "@/features/settings/components/auto-sections";

export const metadata: Metadata = { title: "الإعدادات — التواصل", robots: { index: false, follow: false } };

/** `/dashboard/settings/contact` — M34 (auto save). */
export default function SettingsContactSectionPage() {
  return <ContactSection />;
}
