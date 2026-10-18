import type { Metadata } from "next";
import { RmaScanScreen } from "@/features/returns/components/rma-scan-screen";

export const metadata: Metadata = { title: "مسح الاستلام", robots: { index: false, follow: false } };

/** `/dashboard/returns/rma/scan` — M24 (T124): one large field, Enter submits, focus kept. */
export default function RmaScanPage() {
  return <RmaScanScreen />;
}
