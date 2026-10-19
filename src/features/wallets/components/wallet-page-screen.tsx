"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/access-gate";
import { WalletDetailView } from "@/features/wallets/components/wallet-detail";

/** The full-page frame around the shared detail (M35 FR-35.07). */
export function WalletPageScreen({ walletId }: { walletId: number }) {
  return (
    <AccessGate feature="customer_wallets" permission="customers.view">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/customers/wallets" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-8">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> محافظ العملاء
        </Link>
        <WalletDetailView walletId={walletId} variant="page" />
      </div>
    </AccessGate>
  );
}
