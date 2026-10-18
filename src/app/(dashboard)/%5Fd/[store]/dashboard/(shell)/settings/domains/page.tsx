import type { Metadata } from "next";
import { DomainsScreen } from "@/features/integrations/components/domains-screen";

export const metadata: Metadata = { title: "النطاقات", robots: { index: false, follow: false } };

/** `/dashboard/settings/domains` — M19 US-19.1 (T115). */
export default function Page() {
  return <DomainsScreen />;
}
