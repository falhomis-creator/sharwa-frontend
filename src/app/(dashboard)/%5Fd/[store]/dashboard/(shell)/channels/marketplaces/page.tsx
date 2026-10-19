import type { Metadata } from "next";
import { MarketplacesHubScreen } from "@/features/marketplaces/components/hub-screen";

export const metadata: Metadata = { title: "الأسواق الإلكترونية", robots: { index: false, follow: false } };

/** `/dashboard/channels/marketplaces` — M28 US-28.1 (T158). */
export default function MarketplacesPage() {
  return <MarketplacesHubScreen />;
}
