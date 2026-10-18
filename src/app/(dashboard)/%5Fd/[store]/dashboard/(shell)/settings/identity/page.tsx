import type { Metadata } from "next";
import { IdentitySection } from "@/features/settings/components/auto-sections";

export const metadata: Metadata = { title: "الإعدادات — الهوية", robots: { index: false, follow: false } };

/** `/dashboard/settings/identity` — M34 (auto save). */
export default function SettingsIdentitySectionPage() {
  return <IdentitySection />;
}
