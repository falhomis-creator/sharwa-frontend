import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportScreen } from "@/features/reports/components/report-screen";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

/** No numbers in the title (§8: a forbidden sensitive report must not leak through the tab). */
export const metadata: Metadata = { title: "تقرير", robots: { index: false, follow: false } };

/** `/dashboard/reports/[code]?from&to&compare&location` — M25 (T127): one report (US-25.2/25.3/25.5). */
export default async function ReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9_]{2,40}$/.test(code)) notFound();
  return <ReportScreen code={code} />;
}
