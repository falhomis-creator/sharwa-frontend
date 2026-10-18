import type { Metadata } from "next";
import { PickupLocationsScreen } from "@/features/shipping/components/pickup-locations-screen";

export const metadata: Metadata = { title: "نقاط الاستلام", robots: { index: false, follow: false } };

/** `/dashboard/shipping/pickup-locations` — M15 (T109). */
export default function Page() {
  return <PickupLocationsScreen />;
}
