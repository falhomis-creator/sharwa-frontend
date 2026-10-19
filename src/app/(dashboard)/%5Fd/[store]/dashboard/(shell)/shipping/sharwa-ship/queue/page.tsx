import type { Metadata } from "next";
import { AwbQueueScreen } from "@/features/shipping/sharwa-ship/components/ops-screens";

export const metadata: Metadata = { title: "طابور AWB", robots: { index: false, follow: false } };

/** `/dashboard/shipping/sharwa-ship/queue` — M39 US-39.4 (T179). */
export default function Page() {
  return <AwbQueueScreen />;
}
