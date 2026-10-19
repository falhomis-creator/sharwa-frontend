import type { Metadata } from "next";
import { SessionsScreen } from "@/features/support/components/sessions-screens";

export const metadata: Metadata = { title: "جلسات الدعم الفني", robots: { index: false, follow: false } };

/** `/dashboard/support/sessions` — M32 US-32.4 on the M31 contract (T164). */
export default function SessionsPage() {
  return <SessionsScreen />;
}
