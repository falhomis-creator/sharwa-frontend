import type { Metadata } from "next";
import { RefundsLogScreen } from "@/features/returns/components/refunds-log-screen";

export const metadata: Metadata = { title: "سجل الاسترجاعات", robots: { index: false, follow: false } };

/** `/dashboard/returns/refunds-log` — M24 (T124): the legacy OrderRefund log, read-only. */
export default function RefundsLogPage() {
  return <RefundsLogScreen />;
}
