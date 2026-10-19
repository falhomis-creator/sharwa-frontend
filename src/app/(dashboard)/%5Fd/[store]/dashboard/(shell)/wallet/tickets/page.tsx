import type { Metadata } from "next";
import { TicketsScreen } from "@/features/support/components/tickets-screens";

export const metadata: Metadata = { title: "تذاكر الدعم", robots: { index: false, follow: false } };

/** `/dashboard/wallet/tickets` — M32 US-32.1–32.3 (T164). */
export default function TicketsPage() {
  return <TicketsScreen />;
}
