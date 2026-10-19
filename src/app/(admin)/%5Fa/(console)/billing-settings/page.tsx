import type { Metadata } from "next";
import { BillingSettingsScreen } from "@/features/platform-admin/components/billing/settings-screen";

export const metadata: Metadata = { title: "المفاتيح الرئيسية والحسم" };

/** `console.<base>/billing-settings` — M46 US-46.4, FR-46.04/05. */
export default function BillingSettingsPage() {
  return <BillingSettingsScreen />;
}
