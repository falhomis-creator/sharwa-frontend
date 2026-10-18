import type { Metadata } from "next";
import { AlertsScreen } from "@/features/staff/components/alerts-screen";

export const metadata: Metadata = { title: "تنبيهات السلوك", robots: { index: false, follow: false } };

/** `/dashboard/staff/alerts` — M18 US-18.6.3 (T113). */
export default function AlertsPage() {
  return <AlertsScreen />;
}
