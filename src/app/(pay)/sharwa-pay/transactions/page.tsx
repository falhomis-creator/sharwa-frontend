import type { Metadata } from "next";
import { Suspense } from "react";
import { BalancesSkeleton } from "@/features/sharwa-pay/components/pay-shell";
import { TransactionsScreen } from "@/features/sharwa-pay/components/wallet-screens";

export const metadata: Metadata = { title: "الحركات" };

/** `/sharwa-pay/transactions?currency=&reason=` — M40 (T182). */
export default function Page() {
  // `?currency=&reason=` is read with nuqs (useSearchParams) — needs its own boundary.
  return (
    <Suspense fallback={<BalancesSkeleton />}>
      <TransactionsScreen />
    </Suspense>
  );
}
