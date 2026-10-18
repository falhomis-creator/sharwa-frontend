import type { Metadata } from "next";
import { NewWithdrawalScreen } from "@/features/payments/components/new-withdrawal-screen";

export const metadata: Metadata = { title: "طلب سحب", robots: { index: false, follow: false } };

/** `/dashboard/wallet/withdrawals/new` — M14 (T106). Data is client-fetched through the BFF; owner only. */
export default function Page() {
  return <NewWithdrawalScreen />;
}
