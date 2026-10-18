import type { Metadata } from "next";
import { RmaScreen } from "@/features/returns/components/rma-screen";

export const metadata: Metadata = { title: "مسار RMA", robots: { index: false, follow: false } };

/** `/dashboard/returns/rma` — M24 (T124): RMA list, create sheet, `?rma=` detail sheet. */
export default function RmaPage() {
  return <RmaScreen />;
}
