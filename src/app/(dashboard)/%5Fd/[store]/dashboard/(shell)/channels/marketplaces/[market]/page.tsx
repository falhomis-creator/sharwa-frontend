import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketScreen } from "@/features/marketplaces/components/market-screen";

export const instant = false;
export const metadata: Metadata = { title: "السوق", robots: { index: false, follow: false } };

/** `/dashboard/channels/marketplaces/[amazon|noon]?tab=listings|settings` — M28 US-28.2/28.3 (T158). */
export default async function MarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  if (market !== "amazon" && market !== "noon") notFound();
  return <MarketScreen market={market} />;
}
