import type { Metadata } from "next";
import { PaymentsSection } from "@/features/settings/components/explicit-sections";

export const metadata: Metadata = { title: "الإعدادات — الدفع", robots: { index: false, follow: false } };

/** `/dashboard/settings/payments` — M34 (explicit save). */
export default function SettingsPaymentsSectionPage() {
  return <PaymentsSection />;
}
