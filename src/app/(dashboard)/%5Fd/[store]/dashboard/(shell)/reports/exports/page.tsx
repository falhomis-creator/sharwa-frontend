import type { Metadata } from "next";
import { ExportsScreen } from "@/features/reports/components/exports-screen";

export const metadata: Metadata = { title: "تصديراتي", robots: { index: false, follow: false } };

/** `/dashboard/reports/exports` — M25 (T128): the last 50 export jobs (FR-25.07). */
export default function ReportExportsPage() {
  return <ExportsScreen />;
}
