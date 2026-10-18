import type { Metadata } from "next";
import { ScheduledScreen } from "@/features/reports/components/scheduled-screen";

export const metadata: Metadata = { title: "التقارير المجدولة", robots: { index: false, follow: false } };

/** `/dashboard/reports/scheduled` — M25 (T128): emailed report subscriptions (US-25.4). */
export default function ScheduledReportsPage() {
  return <ScheduledScreen />;
}
