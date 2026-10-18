import type { Metadata } from "next";
import { CurrencySection } from "@/features/settings/components/explicit-sections";

export const metadata: Metadata = { title: "الإعدادات — العملات", robots: { index: false, follow: false } };

/** `/dashboard/settings/currency` — M34 (explicit save). */
export default function SettingsCurrencySectionPage() {
  return <CurrencySection />;
}
