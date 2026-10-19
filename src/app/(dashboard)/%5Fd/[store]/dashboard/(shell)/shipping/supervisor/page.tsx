import type { Metadata } from "next";
import { SupervisorScreen } from "@/features/shipping/sharwa-ship/components/ops-screens";

export const metadata: Metadata = { title: "إشراف المندوبين", robots: { index: false, follow: false } };

/** `/dashboard/shipping/supervisor` — M39 US-39.5 (T179). */
export default function Page() {
  return <SupervisorScreen />;
}
