"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { usePoAction, usePurchaseOrder } from "@/features/procurement/api";
import type { PoDetail } from "@/features/procurement/schemas";
import { PoStatusText, ProcurementGate, ReceivedProgress, useProcurementAccess } from "@/features/procurement/components/bits";
import { Stepper } from "@/features/procurement/components/po-editor";

/**
 * `/dashboard/purchase-orders/[id]/receive` (US-23.4, FR-23.06): per line the ordered,
 * received before, and «المستلَم الآن» capped at the remainder (re-checked by the server);
 * the location whose stock will move is named up front. Server decides
 * `partially_received` / `received`; each quantity becomes a `po_received` movement in M21.
 */
export function ReceiveScreen({ poId }: { poId: number }) {
  return (
    <ProcurementGate>
      <ReceiveInner poId={poId} />
    </ProcurementGate>
  );
}

function ReceiveInner({ poId }: { poId: number }) {
  const query = usePurchaseOrder(poId);
  const { canManage } = useProcurementAccess();
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const po = query.data;
  if (!canManage || (po.status !== "approved" && po.status !== "partially_received")) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">
          الاستلام متاح للأوامر المعتمدة فقط. حالة {po.number} الآن: <PoStatusText status={po.status} />
        </p>
        <Link href={`/dashboard/purchase-orders/${po.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
          العودة إلى الأمر
        </Link>
      </div>
    );
  }
  return <ReceiveForm key={po.version} po={po} onReload={() => void query.refetch()} />;
}

function ReceiveForm({ po, onReload }: { po: PoDetail; onReload: () => void }) {
  const router = useRouter();
  const receive = usePoAction("receive");
  const [qty, setQty] = useState<Record<number, number>>(() => Object.fromEntries(po.lines.map((l) => [l.id, 0])));
  const [conflict, setConflict] = useState(false);
  const total = Object.values(qty).reduce((s, n) => s + n, 0);

  const submit = async () => {
    try {
      const res = await receive.mutateAsync({
        id: po.id,
        version: po.version,
        lines: po.lines.map((l) => ({ line_id: l.id, quantity_received_now: qty[l.id] ?? 0 })).filter((l) => l.quantity_received_now > 0),
      });
      toast.success(res.status === "received" ? `استُلم ${po.number} بالكامل` : `سُجّل استلام جزئي لـ ${po.number}`, { description: `حُدِّث مخزون ${po.location.name}` });
      router.push(`/dashboard/purchase-orders/${po.id}`);
    } catch (e) {
      if (isApiError(e) && e.status === 409) setConflict(true);
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر تسجيل الاستلام");
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader eyebrow={po.number} title="تسجيل الاستلام" description={`سيُحدَّث مخزون الموقع: ${po.location.name}`} />
      {conflict ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm" data-testid="po-conflict">
          حُدِّث الأمر من مستخدم آخر.
          <Button variant="outline" size="sm" className="h-11 lg:h-7" onClick={onReload}>
            إعادة التحميل
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-lg border border-border" data-testid="receive-lines">
        {po.lines.map((l) => {
          const remaining = l.quantity_ordered - l.quantity_received;
          return (
            <li key={l.id} className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between" data-testid="receive-line">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-sm">{l.product_name}</span>
                <Mono className="text-xs text-muted-foreground">{l.sku}</Mono>
                <ReceivedProgress received={l.quantity_received} ordered={l.quantity_ordered} />
              </span>
              <span className="flex flex-col items-start gap-1 md:items-end">
                <span className="text-xs text-muted-foreground">
                  المستلَم الآن — المتبقي <Mono className="text-foreground">{remaining}</Mono>
                </span>
                {remaining > 0 ? (
                  <Stepper value={qty[l.id] ?? 0} max={remaining} onChange={(v) => setQty((s) => ({ ...s, [l.id]: v }))} label={`المستلَم الآن من ${l.sku}`} testId="receive-qty" />
                ) : (
                  <span className="text-sm text-muted-foreground">اكتمل</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button className="h-11 lg:h-9" disabled={total === 0 || receive.isPending} onClick={() => void submit()} data-testid="receive-submit">
          تسجيل استلام <Mono>{total}</Mono> وحدة
        </Button>
        <Button
          variant="outline"
          className="h-11 lg:h-9"
          onClick={() => setQty(Object.fromEntries(po.lines.map((l) => [l.id, l.quantity_ordered - l.quantity_received])))}
          data-testid="receive-all"
        >
          تعبئة كل المتبقي
        </Button>
        <Link href={`/dashboard/purchase-orders/${po.id}`} className={cn(buttonVariants({ variant: "ghost" }), "h-11 lg:h-9")}>
          إلغاء
        </Link>
      </div>
    </div>
  );
}
