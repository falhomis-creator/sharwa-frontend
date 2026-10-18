import type { Metadata } from "next";
import { ReportsIndexScreen } from "@/features/reports/components/reports-index";

export const metadata: Metadata = { title: "التقارير", robots: { index: false, follow: false } };

/** `/dashboard/reports` — M25 (T126): the report registry by category (US-25.1). */
export default function ReportsPage() {
  return <ReportsIndexScreen />;
}
