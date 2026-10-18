import type { Metadata } from "next";
import { ZoneReviewScreen } from "@/features/shipping/components/zone-review-screen";

export const metadata: Metadata = { title: "مراجعة المناطق", robots: { index: false, follow: false } };

/** `/dashboard/shipping/zone-review?tab=review|restricted|sla` — M15 (T109). */
export default function Page() {
  return <ZoneReviewScreen />;
}
