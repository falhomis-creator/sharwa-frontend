import type { Metadata } from "next";
import { StatusesScreen } from "@/features/orders/components/statuses-screen";

export const metadata: Metadata = { title: "حالات التنفيذ", robots: { index: false, follow: false } };

/** `/dashboard/orders/statuses` — M06 US-06.5 (T078). */
export default function OrderStatusesPage() {
  return <StatusesScreen />;
}
