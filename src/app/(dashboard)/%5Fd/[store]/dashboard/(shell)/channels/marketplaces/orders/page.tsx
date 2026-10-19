import type { Metadata } from "next";
import { MarketOrdersScreen } from "@/features/marketplaces/components/orders-screen";

export const metadata: Metadata = { title: "طلبات الأسواق", robots: { index: false, follow: false } };

/** `/dashboard/channels/marketplaces/orders` — M28 US-28.5 (T158). */
export default function MarketOrdersPage() {
  return <MarketOrdersScreen />;
}
