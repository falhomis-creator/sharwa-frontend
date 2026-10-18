"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccessGate } from "@/components/shared/access-gate";
import { ReturnDetailView } from "@/features/returns/components/return-detail";

/** `/dashboard/returns/[id]` — the same detail component as the list's side sheet. */
export function ReturnPage({ returnId }: { returnId: number }) {
  return (
    <AccessGate feature="refunds" permission="orders.process_returns">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/returns" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> المرتجعات
        </Link>
        <ReturnDetailView returnId={returnId} variant="page" />
      </div>
    </AccessGate>
  );
}
