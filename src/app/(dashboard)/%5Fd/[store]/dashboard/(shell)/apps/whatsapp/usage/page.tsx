import type { Metadata } from "next";
import { WhatsappUsageScreen } from "@/features/apps/components/whatsapp-screens";

export const metadata: Metadata = { title: "سجل استخدام الواتساب", robots: { index: false, follow: false } };

/** `/dashboard/apps/whatsapp/usage` — M30 US-30.3 (T164). */
export default function WhatsappUsagePage() {
  return <WhatsappUsageScreen />;
}
