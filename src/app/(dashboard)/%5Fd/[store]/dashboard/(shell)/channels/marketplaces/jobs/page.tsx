import type { Metadata } from "next";
import { MarketJobsScreen } from "@/features/marketplaces/components/jobs-screen";

export const metadata: Metadata = { title: "مهام مزامنة الأسواق", robots: { index: false, follow: false } };

/** `/dashboard/channels/marketplaces/jobs[?job=<id>]` — M28 US-28.4 (T158). */
export default function MarketJobsPage() {
  return <MarketJobsScreen />;
}
