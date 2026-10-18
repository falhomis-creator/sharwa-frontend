"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/shared/page-header";
import { AccessGate } from "@/components/shared/access-gate";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { useOpenCustomer } from "@/features/customers/hooks/use-customer-filters";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { CustomerProfile } from "@/features/customers/components/customer-profile";

/**
 * `/dashboard/customers` (M07, T097): the derived customer table plus the `?customer=<phone>`
 * side sheet that renders the SAME profile as `/dashboard/customers/[phone]` (FR-07.05).
 * Gated by the `customer_report` feature and `customers.view`.
 */
export function CustomersScreen() {
  return (
    <AccessGate feature="customer_report" permission="customers.view">
      <CustomersScreenInner />
    </AccessGate>
  );
}

function CustomersScreenInner() {
  const [{ customer }, setOpen] = useOpenCustomer();
  const session = useSession();
  const viewWarning = session.kind === "staff" && session.behavior?.view === "warning";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="العملاء"
        description="كل رقم هاتف طلب من متجرك: طلباته، ثقته في الدفع عند الاستلام، محفظته ونقاطه."
        actions={
          <>
            <Link href="/dashboard/customers/wallets" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">
              محافظ العملاء
            </Link>
          </>
        }
      />
      {viewWarning ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground" data-testid="view-warning">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          نشاطك مرتفع اليوم — تُحتسب مشاهدات ملفات العملاء ضمن تنبيهات الحجم.
        </p>
      ) : null}
      <CustomersTable />
      <Sheet open={customer !== null} onOpenChange={(o) => !o && void setOpen({ customer: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-2xl" data-testid="customer-sheet">
          <SheetTitle className="sr-only">ملف العميل</SheetTitle>
          <SheetDescription className="sr-only">الطلبات والثقة والمحفظة والنقاط والأمنيات والتقييمات والملاحظات</SheetDescription>
          {customer !== null ? <CustomerProfile key={customer} phone={customer} variant="sheet" /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
