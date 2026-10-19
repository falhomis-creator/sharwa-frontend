import type { Metadata } from "next";
import { WithdrawalsScreen } from "@/features/platform-admin/components/money/withdrawals-screen";

export const metadata: Metadata = { title: "طلبات السحب" };

/** `console.<base>/sharwa-pay/withdrawals` — M20 US-20.5 a2. */
export default function WithdrawalsPage() {
  return <WithdrawalsScreen />;
}
