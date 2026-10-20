"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDropJobs, useResubmitOrder, useRetryJob, useSupplierOrders } from "@/features/dropshipping/api";
import {
  ATTENTION_STATUSES,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
  SUPPLIER_CODES,
  SUPPLIER_LABELS,
  SUPPLIER_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUS_LABELS,
  type JobStatus,
  type SupplierCode,
  type SupplierOrder,
  type SupplierOrderStatus,
  type SyncJob,
} from "@/features/dropshipping/schemas";
import { DropJobStatus, DropshippingGate, DropshippingNav, StatusText, duration } from "@/features/dropshipping/components/bits";

const ORDER_TONE: Record<SupplierOrderStatus, "muted" | "info" | "success" | "warning" | "destructive"> = {
  queued: "muted",
  held: "warning",
  submitted: "info",
  accepted: "info",
  processing: "info",
  shipped: "success",
  delivered: "success",
  cancelled: "muted",
  rejected: "destructive",
  failed: "destructive",
};
const OrderStatus = ({ s }: { s: SupplierOrderStatus }) => <StatusText tone={ORDER_TONE[s]} label={SUPPLIER_ORDER_STATUS_LABELS[s]} testId="supplier-order-status" value={s} />;

/**
 * `/dashboard/channels/dropshipping/orders` (US-29.5, FR-29.08): «تحتاج انتباهاً»
 * (held · rejected · failed) on top with the server's reason, then the rest in a table
 * with the ten statuses; tracking numbers Mono + copy; the original order opens in M06.
 */
const orderParsers = { status: parseAsStringLiteral(SUPPLIER_ORDER_STATUSES), supplier: parseAsStringLiteral(SUPPLIER_CODES), attention: parseAsStringLiteral(["1", "0"] as const) };

export function SupplierOrdersScreen() {
  return (
    <DropshippingGate>
      <OrdersInner />
    </DropshippingGate>
  );
}

function OrdersInner() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(orderParsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const attention = useSupplierOrders({ attention: 1, supplier: f.supplier ?? undefined, page_size: 50 });
  const query = useSupplierOrders({ status: f.status ?? undefined, supplier: f.supplier ?? undefined, attention: f.attention === "1" ? 1 : 0, page: table.page > 1 ? table.page : undefined });
  const resubmit = useResubmitOrder();
  const set = (p: Parameters<typeof setF>[0]) => {
    void setF(p);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<SupplierOrder, unknown>[]>(
    () => [
      { id: "order", header: headerLabel("الطلب"), cell: ({ row }) => <Link href={`/dashboard/orders?order=${row.original.order_id}`} className="hover:underline"><Mono>{row.original.order_number}</Mono></Link> },
      { id: "supplier", header: headerLabel("المورد"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{SUPPLIER_LABELS[row.original.supplier_code]}</span> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <OrderStatus s={row.original.status} /> },
      { id: "ref", header: headerLabel("مرجع المورد"), cell: ({ row }) => (row.original.supplier_reference ? <Mono className="text-xs">{row.original.supplier_reference}</Mono> : <span className="text-muted-foreground">—</span>) },
      { id: "tracking", header: headerLabel("التتبع"), cell: ({ row }) => <Tracking value={row.original.tracking_number} /> },
      { id: "cost", meta: { numeric: true }, header: headerLabel("التكلفة"), cell: ({ row }) => <Money value={row.original.display_cost} /> },
      { id: "at", header: headerLabel("آخر تحديث"), cell: ({ row }) => <time dateTime={row.original.updated_at} title={formatDateTime(row.original.updated_at)} className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.updated_at, now)}</time> },
    ],
    [now],
  );

  const attn = attention.data?.results ?? [];
  const activeCount = [f.status, f.supplier].filter(Boolean).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="طلبات الموردين" description="الطلبات المُحالة إلى الموردين — تُدار من لوحة الطلبات الأصلية." />
      <DropshippingNav active="orders" />
      <section className="flex flex-col gap-2" aria-labelledby="attn" data-testid="attention-section">
        <h2 id="attn" className="flex items-center gap-2 text-base font-medium">
          تحتاج انتباهاً <Mono className="text-muted-foreground" data-testid="attention-count">{attention.data?.count ?? 0}</Mono>
        </h2>
        {attn.length ? (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden">
            {attn.map((o) => (
              <li key={o.id} className="flex flex-col gap-1.5 p-3 text-sm lg:flex-row lg:items-center lg:gap-4" data-testid="attention-row">
                <Link href={`/dashboard/orders?order=${o.order_id}`} className="hover:underline">
                  <Mono className="font-medium">{o.order_number}</Mono>
                </Link>
                <span className="text-muted-foreground">{SUPPLIER_LABELS[o.supplier_code]}</span>
                <OrderStatus s={o.status} />
                <span className="flex-1 text-xs text-muted-foreground">{o.last_error}</span>
                {o.can_resubmit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 self-start lg:h-7"
                    disabled={resubmit.isPending}
                    data-testid="resubmit"
                    onClick={async () => {
                      try {
                        await resubmit.mutateAsync(o.id);
                        toast.success(`أُعيد إرسال ${o.order_number} إلى المورد`);
                      } catch (e) {
                        toast.error(isApiError(e) ? e.userMessage : "تعذّر الإرسال");
                      }
                    }}
                  >
                    إعادة الإرسال
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">لا شيء يحتاج انتباهاً.</p>
        )}
      </section>
      <DataTable<SupplierOrder>
        testId="supplier-orders-table"
        caption="طلبات الموردين"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={20}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(activeCount)}
        emptyState={<EmptyState title="لا طلبات موردين" />}
        renderMobileCard={(o) => (
          <div className="flex flex-col gap-1 p-3 text-sm">
            <span className="flex justify-between">
              <Mono>{o.order_number}</Mono>
              <OrderStatus s={o.status} />
            </span>
            <span className="text-xs text-muted-foreground">{SUPPLIER_LABELS[o.supplier_code]}</span>
            <Tracking value={o.tracking_number} />
          </div>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={() => set({ status: null, supplier: null })}>
            <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as SupplierOrderStatus | null })} options={SUPPLIER_ORDER_STATUSES.filter((s) => !ATTENTION_STATUSES.includes(s)).map((s) => ({ value: s, label: SUPPLIER_ORDER_STATUS_LABELS[s] }))} />
            <FilterSelect label="المورد" value={f.supplier ?? ""} onChange={(v) => set({ supplier: (v || null) as SupplierCode | null })} options={SUPPLIER_CODES.map((c) => ({ value: c, label: SUPPLIER_LABELS[c] }))} />
          </FilterBar>
        }
      />
    </div>
  );
}

function Tracking({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1">
      <Mono className="text-xs" data-testid="tracking-number">
        {value}
      </Mono>
      <button
        type="button"
        aria-label="نسخ رقم التتبع"
        className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:size-7"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success("نُسخ رقم التتبع");
          } catch {
            toast.error("تعذّر النسخ");
          }
        }}
      >
        <Copy className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

/** `/dashboard/channels/dropshipping/jobs` (US-29.6, FR-29.09). */
const jobParsers = { supplier: parseAsStringLiteral(SUPPLIER_CODES), status: parseAsStringLiteral(JOB_STATUSES) };

export function DropJobsScreen() {
  return (
    <DropshippingGate>
      <JobsInner />
    </DropshippingGate>
  );
}

function JobsInner() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(jobParsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const query = useDropJobs({ supplier: f.supplier ?? undefined, status: f.status ?? undefined, page: table.page > 1 ? table.page : undefined });
  const retry = useRetryJob();
  const set = (p: Parameters<typeof setF>[0]) => {
    void setF(p);
    table.resetPage();
  };
  const columns = useMemo<ColumnDef<SyncJob, unknown>[]>(
    () => [
      { id: "id", header: headerLabel("المهمة"), cell: ({ row }) => <Mono>#{row.original.id}</Mono> },
      { id: "type", header: headerLabel("النوع"), cell: ({ row }) => <span className="whitespace-nowrap">{JOB_TYPE_LABELS[row.original.job_type]}</span> },
      { id: "supplier", header: headerLabel("المورد"), cell: ({ row }) => <span className="text-muted-foreground">{SUPPLIER_LABELS[row.original.supplier_code]}</span> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => (
          <span className="flex flex-col gap-0.5">
            <DropJobStatus status={row.original.status} />
            {row.original.last_error ? <span className="text-xs text-muted-foreground" dir="ltr">{row.original.last_error}</span> : null}
          </span>
        ),
      },
      { id: "dur", meta: { numeric: true }, header: headerLabel("المدة"), cell: ({ row }) => <Mono className="text-muted-foreground">{duration(row.original.duration_seconds)}</Mono> },
      { id: "res", meta: { numeric: true }, header: headerLabel("معالَج / أخطاء"), cell: ({ row }) => <Mono>{row.original.processed} / {row.original.errors_count}</Mono> },
      { id: "at", header: headerLabel("الوقت"), cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.created_at, now)}</span> },
      {
        id: "actions",
        header: () => <span className="sr-only">إجراءات</span>,
        cell: ({ row }) => (
          <span className="flex gap-1">
            {row.original.errors_csv_url ? (
              <a href={row.original.errors_csv_url} download className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 lg:h-7")}>
                أخطاء CSV
              </a>
            ) : null}
            {row.original.status === "failed" || row.original.status === "completed_with_errors" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-11 lg:h-7"
                disabled={retry.isPending}
                data-testid="job-retry"
                onClick={async () => {
                  try {
                    const r = await retry.mutateAsync(row.original.id);
                    toast.success(`أُعيد التشغيل — المهمة #${r.job_id}`);
                  } catch (e) {
                    toast.error(isApiError(e) ? e.userMessage : "تعذّرت إعادة التشغيل");
                  }
                }}
              >
                إعادة التشغيل
              </Button>
            ) : null}
          </span>
        ),
      },
    ],
    [now, retry],
  );
  const activeCount = [f.supplier, f.status].filter(Boolean).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="مهام المزامنة" description="مزامنة المنتجات والأسعار والمخزون، والاستيراد، وتشغيل الملفات." />
      <DropshippingNav active="jobs" />
      <DataTable<SyncJob>
        testId="drop-jobs-table"
        caption="مهام مزامنة الموردين"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={20}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(activeCount)}
        emptyState={<EmptyState title="لا مهام بعد" />}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={() => set({ supplier: null, status: null })}>
            <FilterSelect label="المورد" value={f.supplier ?? ""} onChange={(v) => set({ supplier: (v || null) as SupplierCode | null })} options={SUPPLIER_CODES.map((c) => ({ value: c, label: SUPPLIER_LABELS[c] }))} />
            <FilterSelect label="الحالة" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as JobStatus | null })} options={JOB_STATUSES.map((s) => ({ value: s, label: JOB_STATUS_LABELS[s] }))} />
          </FilterBar>
        }
      />
    </div>
  );
}
