import type { Metadata } from "next";
import { TimelineScreen } from "@/features/marketing/components/timeline-screen";

export const metadata: Metadata = { title: "الجدول الزمني", robots: { index: false, follow: false } };

/** `/dashboard/marketing/timeline` — M13 US-13.5.1 (T104). */
export default function Page() {
  return <TimelineScreen />;
}
