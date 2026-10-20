"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDate, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDeleteSupplier, usePurchaseOrders, useSupplier } from "@/features/procurement/api";
import { PoStatusText, ProcurementGate, useProcurementAccess } from "@/features/procurement/components/bits";
import { SupplierSheet } from "@/features/procurement/components/supplier-form";

/** `/dashboard/suppliers/[id]` (US-23.1): the card, its orders, «أمر شراء جديد» prefilled. */
export function SupplierPage({ supplierId }: { supplierId: number }) {
  return (
    <ProcurementGate>
      <SupplierInner supplierId={supplierId} />
    </ProcurementGate>
  );
}

function SupplierInner({ supplierId }: { supplierId: number }) {
  const router = useRouter();
  const { canManage } = useProcurementAccess();
  const query = useSupplier(supplierId);
  const orders = usePurchaseOrders({ supplier: supplierId, page_size: 100 });
  const del = useDeleteSupplier();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const s = query.data;

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.error || !s) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const remove = async () => {
    try {
      await del.mutateAsync(s.id);
      toast.success(`حُذف المورد «${s.name}»`);
      router.push("/dashboard/suppliers");
    } catch (e) {
      setConfirm(false);
      toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف");
    }
  };

  const rows = orders.data?.results ?? [];
  const blocking = s.open_orders_count;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`SUP-${s.id}`}
        title={s.name}
        description={s.is_active ? undefined : "مورد غير نشط — لا يظهر في أوامر الشراء الجديدة."}
        actions={
          canManage ? (
            <>
              <Link href={`/dashboard/purchase-orders/new?supplier=${s.id}`} className={cn(buttonVariants(), "h-11 gap-1.5 lg:h-9")} data-testid="supplier-new-po">
                <Plus className="size-4" aria-hidden /> أمر شراء جديد
              </Link>
              <Button variant="outline" className="h-11 lg:h-9" onClick={() => setEditing(true)}>
                تعديل
              </Button>
              <Button variant="destructive" className="h-11 lg:h-9" onClick={() => setConfirm(true)} data-testid="supplier-delete">
                حذف
              </Button>
            </>
          ) : null
        }
      />
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["مسؤول التواصل", s.contact_name || "—"],
          ["الهاتف", s.phone ? <Mono key="p">{prettyPhone(s.phone)}</Mono> : "—"],
          ["البريد", s.email ? <span key="e" dir="ltr">{s.email}</span> : "—"],
          ["العنوان", s.address || "—"],
          ["الرقم الضريبي", s.tax_number ? <Mono key="t">{s.tax_number}</Mono> : "—"],
          ["أُضيف", <Mono key="d">{formatDate(s.created_at)}</Mono>],
        ].map(([k, v]) => (
          <div key={String(k)} className="flex flex-col gap-0.5 border-b border-border pb-2">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {s.notes ? <p className="max-w-prose text-sm text-muted-foreground">{s.notes}</p> : null}

      <section className="flex flex-col gap-3" aria-labelledby="supplier-orders">
        <h2 id="supplier-orders" className="text-base font-medium">
          أوامر الشراء <Mono className="text-muted-foreground">{orders.data?.count ?? 0}</Mono>
        </h2>
        {orders.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title="لا أوامر شراء لهذا المورد" description="أنشئ أول أمر — المورد مُعبَّأ مسبقاً." />
        ) : (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="supplier-orders">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/purchase-orders/${o.id}`} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm hover:bg-muted">
                  <Mono className="font-medium">{o.number}</Mono>
                  <PoStatusText status={o.status} />
                  <span className="text-muted-foreground">{o.location.name}</span>
                  <Money value={o.display_total} className="ms-auto" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SupplierSheet open={editing} onOpenChange={setEditing} supplier={s} />
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>حذف المورد؟</DialogTitle>
          <DialogDescription>
            {blocking ? (
              <>
                لا يمكن الحذف: المورد مرتبط بـ <Mono>{blocking}</Mono> أمر شراء غير ملغى. ألغِ الأوامر أو اجعل المورد غير نشط.
              </>
            ) : (
              "لا أوامر مرتبطة. الحذف نهائي."
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)} className="h-11 lg:h-9">
              تراجع
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={del.isPending} className="h-11 lg:h-9" data-testid="supplier-delete-confirm">
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
