import type { Metadata } from "next";
import { PointsScreen } from "@/features/wallets/components/points-screen";

export const metadata: Metadata = { title: "نقاط الولاء", robots: { index: false, follow: false } };

/** `/dashboard/customers/points` — M35 US-35.5 (T130). */
export default function PointsPage() {
  return <PointsScreen />;
}
