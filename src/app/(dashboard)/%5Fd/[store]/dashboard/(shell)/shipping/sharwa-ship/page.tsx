import type { Metadata } from "next";
import { SharwaShipScreen } from "@/features/shipping/sharwa-ship/components/sharwa-ship-screen";

export const metadata: Metadata = { title: "شروة شيب", robots: { index: false, follow: false } };

/** `/dashboard/shipping/sharwa-ship` — M39 US-39.1/US-39.2 (T179). */
export default function Page() {
  return <SharwaShipScreen />;
}
