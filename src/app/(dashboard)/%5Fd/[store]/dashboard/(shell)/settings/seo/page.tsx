import type { Metadata } from "next";
import { SeoSection } from "@/features/settings/components/auto-sections";

export const metadata: Metadata = { title: "الإعدادات — SEO", robots: { index: false, follow: false } };

/** `/dashboard/settings/seo` — M34 (auto save). */
export default function SettingsSeoSectionPage() {
  return <SeoSection />;
}
