import type { Metadata } from "next";
import { PoliciesSection } from "@/features/settings/components/auto-sections";

export const metadata: Metadata = { title: "الإعدادات — السياسات", robots: { index: false, follow: false } };

/** `/dashboard/settings/policies` — M34 (auto save). */
export default function SettingsPoliciesSectionPage() {
  return <PoliciesSection />;
}
