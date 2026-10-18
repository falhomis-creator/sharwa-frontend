import type { Metadata } from "next";
import { PaymentsOverviewScreen } from "@/features/payments/components/payments-overview";

export const metadata: Metadata = { title: "المدفوعات", robots: { index: false, follow: false } };

/** `/dashboard/payments` — M14 (T106). Data is client-fetched through the BFF; owner only. */
export default function Page() {
  return <PaymentsOverviewScreen />;
}
