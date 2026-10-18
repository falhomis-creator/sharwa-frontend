"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccessGate } from "@/components/shared/access-gate";
import { CustomerProfile } from "@/features/customers/components/customer-profile";

/** `/dashboard/customers/[phone]` — the full-page profile (FR-07.05), same component as the sheet. */
export function CustomerPage({ phone }: { phone: string }) {
  return (
    <AccessGate feature="customer_report" permission="customers.view">
      <div className="flex min-w-0 flex-col gap-4">
        <Link href="/dashboard/customers" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-8">
          <ArrowRight className="size-4" aria-hidden /> العملاء
        </Link>
        <CustomerProfile phone={phone} variant="page" />
      </div>
    </AccessGate>
  );
}
