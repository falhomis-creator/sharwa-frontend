import type { Metadata } from "next";
import { WithdrawalsScreen } from "@/features/payments/components/withdrawals-screen";

export const metadata: Metadata = { title: "طلبات السحب", robots: { index: false, follow: false } };

/** `/dashboard/wallet/withdrawals` — M14 (T106). Data is client-fetched through the BFF; owner only. */
export default function Page() {
  return <WithdrawalsScreen />;
}
