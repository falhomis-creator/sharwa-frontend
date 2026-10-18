import type { Metadata } from "next";
import { PayoutAccountsScreen } from "@/features/payments/components/payout-accounts-screen";

export const metadata: Metadata = { title: "حسابات الاستلام", robots: { index: false, follow: false } };

/** `/dashboard/payments/payout-accounts` — M14 (T106). Data is client-fetched through the BFF; owner only. */
export default function Page() {
  return <PayoutAccountsScreen />;
}
