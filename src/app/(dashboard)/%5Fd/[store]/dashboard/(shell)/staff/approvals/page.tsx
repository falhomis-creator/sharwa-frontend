import type { Metadata } from "next";
import { ApprovalsScreen } from "@/features/staff/components/approvals-screen";

export const metadata: Metadata = { title: "طلبات الموافقة", robots: { index: false, follow: false } };

/** `/dashboard/staff/approvals` — M18 US-18.5 (T113). */
export default function ApprovalsPage() {
  return <ApprovalsScreen />;
}
