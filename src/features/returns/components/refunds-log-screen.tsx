"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useOrderRefunds } from "@/features/returns/api";
import { ORDER_REFUND_METHODS, ORDER_REFUND_METHOD_LABELS, type OrderRefundRow } from "@/features/returns/schemas";

/**
 * `/dashboard/returns/refunds-log` (M24 US-24.5): the legacy `OrderRefund` log, read-only —
 * refunds are created from the order (M06) only. `method`/`from`/`to`/`q` in the URL.
 */
const parsers = {
  q: parseAsString.withDefault(""),
  method: parseAsStringLiteral(ORDER_REFUND_METHODS),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
};

export function RefundsLogScreen() {
  return (
    <AccessGate feature="refunds" permission="orders.refund">
      <RefundsInner />
    </AccessGate>
  );
}

function RefundsInner() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const query = useOrderRefunds({ q: f.q || undefined, method: f.method ?? undefined, from: f.from || undefined, to: f.to || undefined, page: table.page, page_size: table.pageSize });
  const set = (patch: Partial<{ q: string | null; method: (typeof ORDER_REFUND_METHODS)[number] | null; from: string | null; to: string | null }>) => {
    void setF(patch);
    table.resetPage();
  };
  const activeCount = Number(Boolean(f.method)) + Number(Boolean(f.from || f.to));
  const clear = () => set({ q: null, method: null, from: null, to: null });

  const columns = useMemo<ColumnDef<OrderRefundRow, unknown>[]>(
    () => [
      {
        id: "order",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <Link href={`/dashboard/orders?order=${row.original.order_id}`} className="hover:underline">
            <Mono>#{row.original.order_id}</Mono>
          </Link>
        ),
      },
      { id: "customer", header: headerLabel("العميل"), cell: ({ row }) => <span className="whitespace-nowrap">{row.original.customer_name ?? "—"}</span> },
      { id: "amount", meta: { numeric: true }, header: headerLabel("المبلغ"), cell: ({ row }) => <Money value={row.original.display_amount} /> },
      { id: "method", header: headerLabel("الطريقة"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{ORDER_REFUND_METHOD_LABELS[row.original.method]}</span> },
      { id: "reason", header: headerLabel("السبب"), cell: ({ row }) => <span className="line-clamp-2 min-w-32">{row.original.reason}</span> },
      {
        id: "points",
        meta: { numeric: true },
        header: headerLabel("النقاط المسحوبة"),
        cell: ({ row }) => <Mono className={row.original.loyalty_points_clawed_back ? "" : "text-muted-foreground"}>{row.original.loyalty_points_clawed_back}</Mono>,
      },
      {
        id: "created_at",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("التاريخ"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="text-xs text-muted-foreground">
            {formatRelative(row.original.created_at, now)}
          </time>
        ),
      },
    ],
    [now],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="سجل الاسترجاعات" description="الاسترجاعات المالية المسجّلة على الطلبات — للقراءة؛ يُنشأ الاسترجاع من صفحة الطلب." />
      <DataTable<OrderRefundRow>
        testId="refunds-table"
        caption="سجل الاسترجاعات المالية"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={activeCount > 0 || Boolean(f.q)}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear} search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="رقم الطلب أو الهاتف أو السبب" label="بحث في الاسترجاعات" />}>
            <FilterSelect
              label="الطريقة"
              value={f.method ?? ""}
              onChange={(v) => set({ method: (v || null) as (typeof ORDER_REFUND_METHODS)[number] | null })}
              options={ORDER_REFUND_METHODS.map((m) => ({ value: m, label: ORDER_REFUND_METHOD_LABELS[m] }))}
              testId="filter-method"
            />
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">من</span>
              <input type="date" dir="ltr" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value || null })} className="h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8" aria-label="من تاريخ" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">إلى</span>
              <input type="date" dir="ltr" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value || null })} className="h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8" aria-label="إلى تاريخ" />
            </label>
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <div className="flex min-h-16 w-full items-center gap-3 p-3" data-testid="refund-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline gap-2">
                <Link href={`/dashboard/orders?order=${r.order_id}`} className="inline-flex min-h-11 items-center text-sm font-medium hover:underline">
                  <Mono>#{r.order_id}</Mono>
                </Link>
                <span className="truncate text-xs text-muted-foreground">{ORDER_REFUND_METHOD_LABELS[r.method]}</span>
              </span>
              <span className="truncate text-xs text-muted-foreground">{r.reason}</span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Money value={r.display_amount} className="text-sm" />
              <time dateTime={r.created_at} className="text-[11px] text-muted-foreground">
                {formatRelative(r.created_at, now)}
              </time>
            </span>
          </div>
        )}
        emptyState={<EmptyState title="لا استرجاعات مالية بعد" description="يظهر هنا كل استرجاع يُسجَّل من صفحة الطلب: المبلغ والطريقة والنقاط المسحوبة." />}
        noResultsState={
          <EmptyState
            title="لا استرجاعات تطابق الفلاتر"
            action={
              <button type="button" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" onClick={clear}>
                مسح الفلاتر
              </button>
            }
          />
        }
      />
    </div>
  );
}
