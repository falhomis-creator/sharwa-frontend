"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccessGate } from "@/components/shared/access-gate";
import { RmaDetailView } from "@/features/returns/components/rma-detail";

/** `/dashboard/returns/rma/[id]` — the same detail component as the RMA list's sheet. */
export function RmaPage({ rmaId }: { rmaId: number }) {
  return (
    <AccessGate feature="refunds" permission="orders.process_returns">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/returns/rma" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> مسار RMA
        </Link>
        <RmaDetailView rmaId={rmaId} variant="page" />
      </div>
    </AccessGate>
  );
}
