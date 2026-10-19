import type { Metadata } from "next";
import { WhatsappTemplatesScreen } from "@/features/apps/components/whatsapp-screens";

export const metadata: Metadata = { title: "قوالب الواتساب", robots: { index: false, follow: false } };

/** `/dashboard/apps/whatsapp/templates` — M30 US-30.3 (T164). */
export default function WhatsappTemplatesPage() {
  return <WhatsappTemplatesScreen />;
}
