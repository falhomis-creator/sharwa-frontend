"use client";

import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/shared/page-header";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useOpenOrder } from "@/features/orders/hooks/use-order-filters";
import { OrderDetailView } from "@/features/orders/components/order-detail";
import { OrdersTable } from "@/features/orders/components/orders-table";

/**
 * `/dashboard/orders` (M06, T076): the work table plus the `?order=<id>` side sheet that
 * renders the SAME detail component as `/dashboard/orders/[id]` (FR-06.08).
 */
export function OrdersScreen() {
  const [{ order }, setOpen] = useOpenOrder();
  const { canPermission } = useAccess();
  const canEdit = canPermission("orders.update_status");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الطلبات"
        description="كل طلب من «جديد» إلى «مكتمل»: الحالة المالية وحالة التنفيذ جنباً إلى جنب."
        actions={
          <>
            <Link href="/dashboard/orders/statuses" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">
              <Settings2 className="size-4" aria-hidden /> حالات التنفيذ
            </Link>
            {canEdit ? (
              <Link
                href="/dashboard/orders/new"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:h-9"
                data-testid="new-order"
              >
                <Plus className="size-4" aria-hidden /> طلب يدوي
              </Link>
            ) : null}
          </>
        }
      />
      <OrdersTable />
      <Sheet open={order !== null} onOpenChange={(o) => !o && void setOpen({ order: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-2xl" data-testid="order-sheet">
          <SheetTitle className="sr-only">تفاصيل الطلب {order ?? ""}</SheetTitle>
          <SheetDescription className="sr-only">الحالتان والعناصر والفاتورة والجدول الزمني</SheetDescription>
          {order !== null ? <OrderDetailView key={order} orderId={order} variant="sheet" /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
