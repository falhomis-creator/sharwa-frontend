import type { Metadata } from "next";
import { AuditLogScreen } from "@/features/staff/components/audit-log-screen";

export const metadata: Metadata = { title: "سجل التدقيق", robots: { index: false, follow: false } };

/** `/dashboard/staff/audit-log` — M18 US-18.6 (T113). */
export default function AuditLogPage() {
  return <AuditLogScreen />;
}
