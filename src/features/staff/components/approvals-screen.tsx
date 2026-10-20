"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AccessGate } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { DataTable, FilterBar, FilterSelect, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { APPROVAL_STATUSES, APPROVAL_STATUS_LABELS, APPROVAL_TYPES, APPROVAL_TYPE_LABELS, type Approval, type ApprovalStatus, type ApprovalType } from "@/features/staff/schemas";
import { useApprovals, useStaffCounters, useStaffWrites } from "@/features/staff/api";
import { Row, dangerButton, outlineButton, primaryButton } from "@/features/staff/components/bits";

/**
 * `/dashboard/staff/approvals` (M18 US-18.5, T113): the queue with status/type in the URL,
 * escalated first with «مُصعَّد»; the sheet shows the payload snapshot and decides with
 * `version` (409 → «حُسم الطلب من مستخدم آخر»); own requests cannot be decided (SC-18.2).
 */
export function ApprovalsScreen() {
  return (
    <AccessGate feature="staff_rbac" permission="staff.view">
      <ApprovalsList />
    </AccessGate>
  );
}

const FILTERS = { status: parseAsStringLiteral(APPROVAL_STATUSES).withDefault("pending"), type: parseAsStringLiteral(APPROVAL_TYPES), approval: parseAsInteger };

function ApprovalsList() {
  const table = useTableUrlState();
  const [filters, setFilters] = useQueryStates(FILTERS, { history: "replace" });
  const { session, canPermission } = useAccess();
  const canDecide = session.kind === "merchant" || canPermission("staff.manage");
  const [now] = useState(() => new Date());
  const params = { status: filters.status, type: filters.type ?? undefined, page: table.page, page_size: table.pageSize };
  const query = useApprovals(params);
  const counters = useStaffCounters();
  const set = (patch: Partial<{ status: ApprovalStatus; type: ApprovalType | null }>) => {
    void setFilters(patch);
    table.resetPage();
  };
  const open = query.data?.results.find((a) => a.id === filters.approval) ?? null;

  const columns = useMemo<ColumnDef<Approval, unknown>[]>(
    () => [
      {
        id: "type",
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 font-medium">
              {APPROVAL_TYPE_LABELS[row.original.request_type]}
              {row.original.escalated_at ? <span className="text-xs text-warning">مُصعَّد</span> : null}
            </span>
            <span className="truncate text-xs text-muted-foreground">{row.original.summary}</span>
          </div>
        ),
      },
      { id: "requester", header: headerLabel("مقدِّم الطلب"), cell: ({ row }) => <span className="text-sm">{row.original.requester_name}</span> },
      { id: "approver", header: headerLabel("يحسمه"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.approver_role}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <StatusCell status={row.original.status} /> },
      {
        id: "created",
        header: headerLabel("منذ"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatRelative(row.original.created_at, now)}</span>,
      },
    ],
    [now],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="طلبات الموافقة" description="ما يحتاج قراراً من المالك أو مدير: استرجاعات، إعدام مخزون، خصومات استثنائية، عجز ورديات." />
      <DataTable
        caption="طلبات الموافقة"
        testId="approvals-table"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(filters.type) || filters.status !== "pending"}
        onRowOpen={(r) => void setFilters({ approval: r.id })}
        emptyState={<EmptyState title="لا طلبات معلّقة" description="عندما يطلب موظف استرجاعاً أو خصماً فوق حده، يظهر هنا." />}
        noResultsState={<EmptyState title="لا طلبات بهذه الفلاتر" />}
        toolbar={
          <div className="flex flex-col gap-3">
            <StatStrip
              label="حالة الطلبات"
              items={APPROVAL_STATUSES.map((s) => ({ key: s, label: APPROVAL_STATUS_LABELS[s], count: s === "pending" ? counters.data?.pending_approvals : undefined, active: filters.status === s, onSelect: () => set({ status: s }), tone: s === "pending" ? "warning" : undefined }))}
            />
            <FilterBar activeCount={filters.type ? 1 : 0} onClear={() => set({ type: null })}>
              <FilterSelect label="النوع" value={filters.type ?? ""} onChange={(v) => set({ type: (v || null) as ApprovalType | null })} options={APPROVAL_TYPES.map((t) => ({ value: t, label: APPROVAL_TYPE_LABELS[t] }))} />
            </FilterBar>
          </div>
        }
        renderMobileCard={(r) => (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {APPROVAL_TYPE_LABELS[r.request_type]} {r.escalated_at ? <span className="text-xs text-warning">مُصعَّد</span> : null}
              </span>
              <StatusCell status={r.status} />
            </div>
            <p className="text-xs text-muted-foreground">{r.summary}</p>
            <p className="text-xs text-muted-foreground">
              {r.requester_name} · {formatRelative(r.created_at, now)}
            </p>
          </div>
        )}
      />
      <Sheet open={open !== null} onOpenChange={(o) => !o && void setFilters({ approval: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-lg" data-testid="approval-sheet">
          {open ? <ApprovalSheet key={open.id} approval={open} canDecide={canDecide} onDone={() => void setFilters({ approval: null })} onReload={() => void query.refetch()} /> : <Skeleton className="h-40" />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatusCell({ status }: { status: ApprovalStatus }) {
  const dot = status === "pending" ? "bg-warning" : status === "approved" ? "bg-success" : "bg-destructive";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}

function entityHref(e: NonNullable<Approval["entity"]>): string | null {
  switch (e.kind) {
    case "order":
      return `/dashboard/orders/${e.id}`;
    case "product":
      return `/dashboard/products/${e.id}`;
    case "purchase_order":
      return `/dashboard/suppliers/purchase-orders/${e.id}`;
    default:
      return null;
  }
}

function ApprovalSheet({ approval, canDecide, onDone, onReload }: { approval: Approval; canDecide: boolean; onDone: () => void; onReload: () => void }) {
  const writes = useStaffWrites();
  const [note, setNote] = useState("");
  const [conflict, setConflict] = useState(false);
  const pending = approval.status === "pending";
  const blockedReason = approval.is_mine ? "لا يمكنك الموافقة على طلبك" : !canDecide ? "حسم الطلبات للمالك أو من يملك إدارة الموظفين" : null;
  const canAct = pending && blockedReason === null && !conflict;

  const decide = async (decision: "approved" | "rejected") => {
    if (!canAct) return;
    try {
      await writes.resolveApproval.mutateAsync({ id: approval.id, decision, note: note.trim() || undefined, version: approval.version });
      toast.success(decision === "approved" ? "اعتُمد الطلب." : "رُفض الطلب.");
      onDone();
    } catch (e) {
      if (isApiError(e) && e.status === 409) setConflict(true);
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر حسم الطلب.");
    }
  };

  // Keyboard A / R inside the sheet (US-18.5) — never while typing the note.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLTextAreaElement || ev.target instanceof HTMLInputElement) return;
      if (ev.key === "a" || ev.key === "A") void decide("approved");
      if (ev.key === "r" || ev.key === "R") void decide("rejected");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const href = approval.entity && approval.entity.available ? entityHref(approval.entity) : null;

  return (
    <div className="flex flex-col gap-5">
      <SheetHeader className="p-0 text-start">
        <SheetTitle className="flex items-center gap-2">
          {APPROVAL_TYPE_LABELS[approval.request_type]} <Mono className="text-sm text-muted-foreground">#{approval.id}</Mono>
          {approval.escalated_at ? <span className="text-xs font-normal text-warning">مُصعَّد</span> : null}
        </SheetTitle>
        <SheetDescription>{approval.summary}</SheetDescription>
      </SheetHeader>

      <dl className="divide-y divide-border/60 surface-card px-3 overflow-hidden">
        <Row label="مقدِّم الطلب">{approval.requester_name}</Row>
        <Row label="يحسمه">{approval.approver_role}</Row>
        <Row label="الحالة">
          <StatusCell status={approval.status} />
        </Row>
        <Row label="أُنشئ">{formatDateTime(approval.created_at)}</Row>
        {approval.escalated_at ? <Row label="صُعِّد">{formatDateTime(approval.escalated_at)}</Row> : null}
        <Row label="الكيان">
          {approval.entity ? (
            href ? (
              <Link href={href} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground lg:min-h-0">
                {approval.entity.label}
              </Link>
            ) : (
              <span className={cn(!approval.entity.available && "text-muted-foreground")}>{approval.entity.available ? approval.entity.label : "الكيان غير متاح"}</span>
            )
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        {approval.decided_by ? (
          <Row label="حُسم">
            {approval.decided_by} · {approval.decided_at ? formatDateTime(approval.decided_at) : ""}
          </Row>
        ) : null}
        {approval.note ? <Row label="ملاحظة">{approval.note}</Row> : null}
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">لقطة البيانات</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 p-3 text-sm" data-testid="approval-payload">
          {Object.entries(approval.payload).map(([k, v]) => (
            <PayloadRow key={k} k={k} v={v} />
          ))}
        </dl>
      </section>

      {conflict ? (
        <div role="alert" className="flex flex-col gap-2 surface-card p-4 text-sm" data-testid="approval-conflict">
          <p className="font-medium">حُسم الطلب من مستخدم آخر</p>
          <p className="text-muted-foreground">تغيّرت نسخة الطلب منذ فتحته. أعد التحميل لرؤية القرار.</p>
          <button
            type="button"
            className={`${outlineButton} self-start`}
            onClick={() => {
              onReload();
              onDone();
            }}
          >
            إعادة التحميل
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">ملاحظة (اختياري)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} disabled={!canAct} className="min-h-11 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30" placeholder="سبب القرار يظهر لمقدِّم الطلب." />
          </label>
          {blockedReason ? (
            <p role="status" className="text-sm text-muted-foreground" data-testid="approval-blocked">
              {blockedReason}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              اختصار: <Mono>A</Mono> اعتماد · <Mono>R</Mono> رفض
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={dangerButton} disabled={!canAct || writes.resolveApproval.isPending} title={blockedReason ?? undefined} onClick={() => void decide("rejected")} data-testid="reject">
              رفض
            </button>
            <button type="button" className={primaryButton} disabled={!canAct || writes.resolveApproval.isPending} title={blockedReason ?? undefined} onClick={() => void decide("approved")} data-testid="approve">
              اعتماد
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PayloadRow({ k, v }: { k: string; v: unknown }) {
  const text = typeof v === "boolean" ? (v ? "نعم" : "لا") : v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
  const mono = typeof v === "number" || /^[\d.,%:/\-+ ]+$/.test(text);
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words text-end">{mono ? <Mono>{text}</Mono> : text}</dd>
    </>
  );
}
