import type { Metadata } from "next";
import { WebhooksScreen } from "@/features/integrations/components/webhooks-screen";

export const metadata: Metadata = { title: "Webhooks", robots: { index: false, follow: false } };

/** `/dashboard/settings/webhooks` — M19 US-19.3 (T115). */
export default function Page() {
  return <WebhooksScreen />;
}
