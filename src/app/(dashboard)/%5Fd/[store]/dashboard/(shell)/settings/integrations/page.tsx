import type { Metadata } from "next";
import { IntegrationsScreen } from "@/features/integrations/components/integrations-screen";

export const metadata: Metadata = { title: "التكاملات", robots: { index: false, follow: false } };

/** `/dashboard/settings/integrations` — M19 US-19.4 (T115). */
export default function Page() {
  return <IntegrationsScreen />;
}
