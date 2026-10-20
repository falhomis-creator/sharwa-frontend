"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePoAction, usePurchaseOrder, useSubmitPo } from "@/features/procurement/api";
import { PO_ACTIONS, type PoDetail } from "@/features/procurement/schemas";
import { PoStatusText, PoTimeline, ProcurementGate, ReceivedProgress, useProcurementAccess } from "@/features/procurement/components/bits";
import { PoEditor } from "@/features/procurement/components/po-editor";

/**
 * `/dashboard/purchase-orders/[id]` (US-23.2…23.4, FR-23.04/05/07/08): header with the
 * buttons the status allows, lines with the server's `display_*`, the approval, and the
 * timeline. A draft opens the editor with `?edit=1`. Every decision sends `version`; a 409
 * shows «حُدِّث الأمر من مستخدم آخر» with a reload.
 */
export function PoPage({ poId }: { poId: number }) {
  return (
    <ProcurementGate>
      <PoInner poId={poId} />
    </ProcurementGate>
  );
}

function PoInner({ poId }: { poId: number }) {
  const query = usePurchaseOrder(poId);
  const [edit] = useQueryState("edit");
  const [now] = useState(() => new Date());
  const [conflict, setConflict] = useState(false);
  const po = query.data;

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.error || !po) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const editing = edit === "1" && po.status === "draft";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={po.number}
        title={`أمر شراء من ${po.supplier.name}`}
        description={`الاستلام في: ${po.location.name}`}
        actions={editing ? null : <Actions po={po} onConflict={() => setConflict(true)} />}
      />
      {conflict ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 surface-card p-4 text-sm" data-testid="po-conflict">
          <span>حُدِّث الأمر من مستخدم آخر.</span>
          <Button
            variant="outline"
            size="sm"
            className="h-11 lg:h-7"
            onClick={() => {
              setConflict(false);
              void query.refetch();
            }}
          >
            إعادة التحميل
          </Button>
        </div>
      ) : null}
      {editing ? (
        <PoEditor initial={po} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">الحالة</dt>
                <dd>
                  <PoStatusText status={po.status} />
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">الإجمالي</dt>
                <dd>
                  <Money value={po.display_total} className="font-medium" />
                </dd>
              </div>
              {po.approval ? (
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">طلب الموافقة</dt>
                  <dd>
                    <Link href={`/dashboard/staff/approvals?approval=${po.approval.id}`} className="underline underline-offset-4" data-testid="po-approval-link">
                      <Mono>#{po.approval.id}</Mono>
                    </Link>{" "}
                    <span className="text-muted-foreground">· {po.approval.approver_role}</span>
                  </dd>
                </div>
              ) : null}
              {po.approver ? (
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">المعتمِد</dt>
                  <dd>{po.approver}</dd>
                </div>
              ) : null}
            </dl>
            <LinesTable po={po} />
            {po.notes ? (
              <section className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">ملاحظات</h2>
                <p className="max-w-prose text-sm text-muted-foreground">{po.notes}</p>
              </section>
            ) : null}
          </div>
          <aside className="flex flex-col gap-3" aria-labelledby="po-tl">
            <h2 id="po-tl" className="text-base font-medium">
              الجدول الزمني
            </h2>
            <PoTimeline events={po.timeline} now={now} />
            <p className="text-xs text-muted-foreground">
              آخر تحديث <Mono>{formatDateTime(po.updated_at)}</Mono>
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function LinesTable({ po }: { po: PoDetail }) {
  const showProgress = po.status === "partially_received" || po.status === "received" || po.status === "approved";
  return (
    <div className="overflow-x-auto surface-card">
      <table className="w-full min-w-[640px] text-sm" data-testid="po-lines-table">
        <caption className="sr-only">سطور أمر الشراء</caption>
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start font-normal">المنتج</th>
            <th className="px-3 py-2 text-end font-normal">المطلوب</th>
            {showProgress ? <th className="px-3 py-2 text-start font-normal">الاستلام</th> : null}
            <th className="px-3 py-2 text-end font-normal">تكلفة الوحدة</th>
            <th className="px-3 py-2 text-end font-normal">الإجمالي</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {po.lines.map((l) => (
            <tr key={l.id} className="h-11">
              <td className="px-3 py-2">
                <span className="flex flex-col">
                  <span>
                    {l.product_name}
                    {l.product_deleted ? <span className="ms-2 text-xs text-muted-foreground">(محذوف)</span> : null}
                  </span>
                  <Mono className="text-xs text-muted-foreground">{l.sku}</Mono>
                </span>
              </td>
              <td className="px-3 py-2 text-end">
                <Mono>{l.quantity_ordered}</Mono>
              </td>
              {showProgress ? (
                <td className="px-3 py-2">
                  <ReceivedProgress received={l.quantity_received} ordered={l.quantity_ordered} />
                </td>
              ) : null}
              <td className="px-3 py-2 text-end">
                <Money value={l.display_unit_cost} />
              </td>
              <td className="px-3 py-2 text-end">
                <Money value={l.display_line_total} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border">
          <tr className="h-11">
            <td colSpan={showProgress ? 4 : 3} className="px-3 py-2 text-end text-muted-foreground">
              إجمالي الأمر
            </td>
            <td className="px-3 py-2 text-end">
              <Money value={po.display_total} className="font-medium" />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Actions({ po, onConflict }: { po: PoDetail; onConflict: () => void }) {
  const router = useRouter();
  const { canManage, canApprove } = useProcurementAccess();
  const submit = useSubmitPo();
  const resolve = usePoAction("resolve");
  const cancel = usePoAction("cancel");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const allowed = PO_ACTIONS[po.status];

  const handle = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      if (isApiError(e) && e.status === 409 && /مستخدم آخر/.test(e.userMessage)) onConflict();
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر تنفيذ الإجراء");
    }
  };

  const busy = submit.isPending || resolve.isPending || cancel.isPending;
  const btn = "h-11 lg:h-9";
  return (
    <>
      {canManage && allowed.includes("edit") ? (
        <Link href={`/dashboard/purchase-orders/${po.id}?edit=1`} className={cn(buttonVariants({ variant: "outline" }), btn)} data-testid="po-edit">
          تعديل
        </Link>
      ) : null}
      {canManage && allowed.includes("submit") ? (
        <Button
          className={btn}
          disabled={busy}
          data-testid="po-submit"
          onClick={() => {
            if (!po.lines.length) {
              toast.error("أضف سطراً واحداً على الأقل");
              return;
            }
            void handle(() => submit.mutateAsync({ id: po.id, version: po.version }), `أُرسل ${po.number} للموافقة`);
          }}
        >
          إرسال للموافقة
        </Button>
      ) : null}
      {canApprove && allowed.includes("resolve") ? (
        <>
          <Button className={btn} disabled={busy} data-testid="po-approve" onClick={() => void handle(() => resolve.mutateAsync({ id: po.id, version: po.version, decision: "approve" }), `اعتُمد ${po.number}`)}>
            اعتماد
          </Button>
          <Button variant="outline" className={btn} disabled={busy} data-testid="po-reject" onClick={() => void handle(() => resolve.mutateAsync({ id: po.id, version: po.version, decision: "reject" }), `رُفض ${po.number} وأُعيد مسودة`)}>
            رفض
          </Button>
        </>
      ) : null}
      {canManage && allowed.includes("receive") ? (
        <Button className={btn} onClick={() => router.push(`/dashboard/purchase-orders/${po.id}/receive`)} data-testid="po-receive">
          تسجيل استلام
        </Button>
      ) : null}
      {canManage && allowed.includes("cancel") ? (
        <Button variant="destructive" className={btn} disabled={busy} onClick={() => setConfirmCancel(true)} data-testid="po-cancel">
          إلغاء الأمر
        </Button>
      ) : null}
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogTitle>إلغاء {po.number}؟</DialogTitle>
          <DialogDescription>الإلغاء نهائي. الكميات المستلمة سابقاً تبقى في المخزون.</DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className={btn} onClick={() => setConfirmCancel(false)}>
              تراجع
            </Button>
            <Button
              variant="destructive"
              className={btn}
              data-testid="po-cancel-confirm"
              onClick={() => {
                setConfirmCancel(false);
                void handle(() => cancel.mutateAsync({ id: po.id, version: po.version }), `أُلغي ${po.number}`);
              }}
            >
              إلغاء الأمر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
