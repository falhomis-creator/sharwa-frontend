"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ForbiddenState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, headerLabel } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useOrder } from "@/features/orders/api";
import { ConfirmDialog } from "@/features/marketing/components/shared";
import { useB2bDrafts, useResolveB2b } from "@/features/b2b/api";
import { B2B_DECISION_LABELS, type B2bDecision, type B2bDraft } from "@/features/b2b/schemas";

/**
 * `/dashboard/orders/b2b` (M36 US-36.2): the pending wholesale drafts and their decision.
 * One counter in the title (§11 I), escalated first. «اعتماد» / «رفض» send the approval's
 * `version`; the server's 403 (self-approval) and 409 (decided elsewhere) are shown as
 * readable sentences, never as raw errors (SC-36.2). Decision buttons are hidden without
 * `orders.approve_b2b` and disabled on the member's own drafts (FR-36.05).
 */
export function B2bDraftsScreen() {
  const { canPermission } = useAccess();
  const canCreate = canPermission("orders.create_b2b");
  const canApprove = canPermission("orders.approve_b2b");
  if (!canCreate && !canApprove) return <ForbiddenState title="مسودات الجملة تتطلب صلاحية إنشاء طلبات الجملة أو اعتمادها" />;
  return <DraftsInner canCreate={canCreate} canApprove={canApprove} />;
}

type Pending = { draft: B2bDraft; decision: B2bDecision };

function DraftsInner({ canCreate, canApprove }: { canCreate: boolean; canApprove: boolean }) {
  const { session } = useAccess();
  const router = useRouter();
  const drafts = useB2bDrafts();
  const resolve = useResolveB2b();
  const [openId, setOpenId] = useQueryState("draft", parseAsInteger.withOptions({ history: "replace" }));
  const [pending, setPending] = useState<Pending | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const rows = drafts.data ?? [];
  const me = session.kind === "staff" ? (session.staff?.full_name ?? null) : null;
  const isMine = (d: B2bDraft) => Boolean(me && d.created_by_name && d.created_by_name === me);
  const open = rows.find((d) => d.id === openId) ?? null;

  async function decide(p: Pending) {
    if (p.draft.approval_id === null || p.draft.approval_version === null) return;
    setConflict(null);
    try {
      const res = await resolve.mutateAsync({ approvalId: p.draft.approval_id, decision: p.decision, version: p.draft.approval_version });
      toast.success(`${res.detail} — ${B2B_DECISION_LABELS[res.decision]}`, {
        action: { label: "فتح الطلب", onClick: () => router.push(`/dashboard/orders/${p.draft.id}`) },
      });
      setPending(null);
      if (openId === p.draft.id) void setOpenId(null);
    } catch (err) {
      setPending(null);
      if (isApiError(err) && err.status === 409) setConflict("حُدِّثت الموافقة من مستخدم آخر — حدّث القائمة لترى الحالة الأخيرة.");
      else if (isApiError(err) && err.status === 403) setConflict(err.detail ?? "لا يمكنك اعتماد طلبك.");
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر حسم الموافقة.");
    }
  }

  const columns = useMemo<ColumnDef<B2bDraft, unknown>[]>(
    () => [
      {
        id: "order",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); void setOpenId(row.original.id); }} className="inline-flex min-h-11 items-center hover:underline lg:min-h-8" aria-label={`تفاصيل مسودة #${row.original.id}`} data-testid="b2b-open">
              <Mono>#{row.original.id}</Mono>
            </button>
            {row.original.escalated_at ? <span className="text-xs text-warning" data-testid="escalated">مُصعَّدة</span> : null}
          </span>
        ),
      },
      { id: "customer", header: headerLabel("العميل"), cell: ({ row }) => <span className="whitespace-nowrap">{row.original.customer_name}</span> },
      { id: "phone", header: headerLabel("الهاتف"), cell: ({ row }) => <Mono className="text-xs">{row.original.customer_phone}</Mono> },
      { id: "total", meta: { numeric: true }, header: headerLabel("الإجمالي"), cell: ({ row }) => <DraftTotal d={row.original} /> },
      { id: "items", meta: { numeric: true }, header: headerLabel("العناصر"), cell: ({ row }) => <Mono>{formatNumber(row.original.items_count)}</Mono> },
      { id: "by", header: headerLabel("أنشأها"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.created_by_name ?? "—"}</span> },
      {
        id: "created",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("التاريخ"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="text-xs text-muted-foreground">
            {formatRelative(row.original.created_at, now)}
          </time>
        ),
      },
      {
        id: "actions",
        meta: { srOnlyHeader: true },
        header: headerLabel("القرار"),
        cell: ({ row }) => <DecisionButtons d={row.original} canApprove={canApprove} mine={isMine(row.original)} onDecide={(decision) => setPending({ draft: row.original, decision })} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canApprove, me, now, setOpenId],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مسودات الجملة"
        eyebrow={drafts.data ? `${formatNumber(rows.filter((r) => r.approval_id !== null).length)} بانتظار الموافقة` : undefined}
        description="طلبات جملة أنشأها موظفو المبيعات وتنتظر قرار المعتمد. لا يعتمد أحد طلبه بنفسه."
        actions={
          canCreate ? (
            <Link href="/dashboard/orders/b2b/new" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:h-9" data-testid="new-b2b">
              مسودة جملة جديدة
            </Link>
          ) : null
        }
      />
      {!canApprove ? <p className="text-sm text-muted-foreground">تعرض مسوداتك المعلّقة — الاعتماد يتطلب صلاحية «اعتماد طلبات الجملة».</p> : null}
      {conflict ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm" data-testid="b2b-conflict">
          <span className="text-destructive">{conflict}</span>
          <Button
            type="button"
            variant="outline"
            className="h-11 lg:h-8"
            onClick={() => {
              setConflict(null);
              void drafts.refetch();
            }}
            data-testid="b2b-refresh"
          >
            تحديث القائمة
          </Button>
        </div>
      ) : null}
      <DataTable<B2bDraft>
        testId="b2b-table"
        caption="مسودات الجملة المعلّقة"
        columns={columns}
        data={drafts.data}
        getRowId={(d) => String(d.id)}
        total={rows.length}
        page={1}
        pageSize={Math.max(20, rows.length)}
        onPageChange={() => undefined}
        isLoading={drafts.isLoading}
        isFetching={drafts.isFetching}
        error={drafts.error}
        onRetry={() => void drafts.refetch()}
        onRowOpen={(d) => void setOpenId(d.id)}
        renderMobileCard={(d) => (
          <div className="flex w-full flex-col gap-2 p-3" data-testid="b2b-card">
            <button type="button" onClick={() => void setOpenId(d.id)} className="flex min-h-11 items-center gap-3 text-start">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{d.customer_name}</span>
                <span className="text-xs text-muted-foreground">
                  <Mono>#{d.id}</Mono> · <Mono>{formatNumber(d.items_count)}</Mono> عناصر{d.escalated_at ? <span className="ms-1 text-warning">· مُصعَّدة</span> : null}
                </span>
              </span>
              <DraftTotal d={d} />
            </button>
            <DecisionButtons d={d} canApprove={canApprove} mine={isMine(d)} onDecide={(decision) => setPending({ draft: d, decision })} full />
          </div>
        )}
        emptyState={<EmptyState title="لا مسودات معلّقة" description="تظهر هنا مسودات الجملة حتى يحسمها معتمد." action={canCreate ? <Link href="/dashboard/orders/b2b/new" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9">مسودة جملة جديدة</Link> : null} />}
      />
      <DraftSheet
        draft={open}
        onClose={() => void setOpenId(null)}
        canApprove={canApprove}
        mine={open ? isMine(open) : false}
        onDecide={(decision) => open && setPending({ draft: open, decision })}
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.decision === "approved" ? `اعتماد مسودة #${pending?.draft.id}؟` : `رفض مسودة #${pending?.draft.id}؟`}
        description={pending ? `${pending.draft.customer_name} — ${pending.draft.total_price} ${pending.draft.currency}` : undefined}
        confirmLabel={pending?.decision === "approved" ? "اعتماد" : "رفض"}
        destructive={pending?.decision === "rejected"}
        pending={resolve.isPending}
        onConfirm={() => pending && void decide(pending)}
        testId="b2b-confirm"
      />
    </div>
  );
}

/** `total_price` is the server's decimal text; shown verbatim beside its currency code. */
function DraftTotal({ d }: { d: B2bDraft }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <Money value={d.total_price} />
      <Mono className="text-[11px] text-muted-foreground">{d.currency}</Mono>
    </span>
  );
}

function DecisionButtons({ d, canApprove, mine, onDecide, full }: { d: B2bDraft; canApprove: boolean; mine: boolean; onDecide: (decision: B2bDecision) => void; full?: boolean }) {
  if (!canApprove) return null;
  if (d.approval_id === null) return <span className="text-xs text-muted-foreground" data-testid="b2b-readonly">للقراءة فقط</span>;
  const hint = mine ? "لا يمكنك اعتماد طلبك" : undefined;
  // Semantic text colours, no filled colour buttons (§11 I).
  const cls = cn("h-11 lg:h-8", full && "flex-1");
  return (
    <span className={cn("flex items-center gap-1.5", full && "w-full")} title={hint}>
      <Button type="button" variant="outline" className={cn(cls, "text-success")} disabled={mine} onClick={(e) => { e.stopPropagation(); onDecide("approved"); }} data-testid="b2b-approve">
        اعتماد
      </Button>
      <Button type="button" variant="outline" className={cn(cls, "text-destructive")} disabled={mine} onClick={(e) => { e.stopPropagation(); onDecide("rejected"); }} data-testid="b2b-reject">
        رفض
      </Button>
    </span>
  );
}

/** Detail sheet: the order's lines from M06 (snapshot names for deleted products, §8). `A`/`R` decide. */
function DraftSheet({ draft, onClose, canApprove, mine, onDecide }: { draft: B2bDraft | null; onClose: () => void; canApprove: boolean; mine: boolean; onDecide: (d: B2bDecision) => void }) {
  const order = useOrder(draft?.id ?? null);
  useEffect(() => {
    if (!draft || !canApprove || mine || draft.approval_id === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (document.querySelectorAll("[role=dialog]").length > 1) return;
      const k = e.key.toLowerCase();
      if (k === "a") onDecide("approved");
      if (k === "r") onDecide("rejected");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, canApprove, mine, onDecide]);
  return (
    <Sheet open={draft !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-lg" data-testid="b2b-sheet">
        <SheetTitle className="text-lg font-semibold">مسودة جملة {draft ? <Mono>#{draft.id}</Mono> : null}</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-muted-foreground">{draft ? `${draft.customer_name} · ${draft.customer_phone}` : ""}</SheetDescription>
        {draft ? (
          <div className="mt-5 flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">الإجمالي</dt><dd><DraftTotal d={draft} /></dd></div>
              <div><dt className="text-xs text-muted-foreground">أنشأها</dt><dd>{draft.created_by_name ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">طلب الموافقة</dt><dd>{draft.approval_id !== null ? <Mono>#{draft.approval_id}</Mono> : <span className="text-muted-foreground">غير مرتبط</span>}</dd></div>
              <div><dt className="text-xs text-muted-foreground">التاريخ</dt><dd className="text-xs">{formatDateTime(draft.created_at)}</dd></div>
            </dl>
            <section aria-label="السطور" className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">السطور</h3>
              {order.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : order.error ? (
                <ErrorState error={order.error} onRetry={() => void order.refetch()} />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {order.data?.items.map((it) => (
                    <li key={it.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{it.product_name}{it.product_deleted ? <span className="ms-1 text-xs text-muted-foreground">محذوف</span> : null}</span>
                        <Mono className="text-[11px] text-muted-foreground">{it.sku_snapshot}</Mono>
                      </span>
                      <Mono className="text-xs text-muted-foreground">×{Number(it.quantity)}</Mono>
                      <Money value={it.display_line_total} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <Link href={`/dashboard/orders/${draft.id}`} className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
              فتح الطلب في الطلبات <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
            </Link>
            {canApprove ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <DecisionButtons d={draft} canApprove={canApprove} mine={mine} onDecide={onDecide} full />
                {mine ? <p className="text-xs text-muted-foreground">لا يمكنك اعتماد طلبك — يحسمه معتمد آخر.</p> : draft.approval_id !== null ? <p className="text-xs text-muted-foreground">اختصار: <Mono>A</Mono> اعتماد · <Mono>R</Mono> رفض</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
