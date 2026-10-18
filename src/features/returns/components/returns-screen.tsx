"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useReturnCounts, useReturns } from "@/features/returns/api";
import { RETURN_REFUND_METHOD_LABELS, RETURN_STATUSES, RETURN_STATUS_LABELS, type ReturnListItem } from "@/features/returns/schemas";
import { ReturnStatusText } from "@/features/returns/components/status";
import { ReturnDetailView } from "@/features/returns/components/return-detail";

/**
 * `/dashboard/returns` (M24 US-24.1): `GET /api/v1/returns/?status&q` as is (DRF pages of
 * 20), `status`/`q` in the URL, a text strip with the five counts, row → the `?return=`
 * side sheet rendering the same detail as `/dashboard/returns/[id]`.
 */
const PAGE_SIZE = 20;
const parsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(RETURN_STATUSES),
  return: parseAsInteger,
};

export function ReturnsScreen() {
  return (
    <AccessGate feature="refunds" permission="orders.process_returns">
      <ReturnsInner />
    </AccessGate>
  );
}

function ReturnsInner() {
  const router = useRouter();
  const table = useTableUrlState();
  const [{ q, status, return: openId }, setParams] = useQueryStates(parsers, { history: "replace" });
  const { canPermission } = useAccess();
  const canWrite = canPermission("orders.process_returns");
  const counts = useReturnCounts(canWrite);
  const [now] = useState(() => new Date());
  const query = useReturns({ status: status ?? undefined, q: q || undefined, page: table.page > 1 ? table.page : undefined });
  const data = query.data;

  const set = (patch: Partial<{ q: string | null; status: (typeof RETURN_STATUSES)[number] | null }>) => {
    void setParams(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<ReturnListItem, unknown>[]>(
    () => [
      {
        id: "id",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("الرقم"),
        cell: ({ row }) => (
          <Link href={`/dashboard/returns/${row.original.id}`} tabIndex={-1} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            <Mono>#{row.original.id}</Mono>
          </Link>
        ),
      },
      {
        id: "order",
        meta: { className: "whitespace-nowrap" },
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <Link href={`/dashboard/orders?order=${row.original.order_id}`} tabIndex={-1} className="text-muted-foreground hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
            <Mono>#{row.original.order_id}</Mono>
          </Link>
        ),
      },
      {
        id: "customer",
        header: headerLabel("العميل"),
        cell: ({ row }) => (
          <button
            type="button"
            tabIndex={-1}
            className="flex min-w-32 flex-col text-start leading-tight hover:underline"
            onClick={() => void setParams({ return: row.original.id })}
            data-testid="return-open"
          >
            <span className="truncate">{row.original.customer_name}</span>
            <Mono className="text-[11px] text-muted-foreground">{prettyPhone(row.original.customer_phone)}</Mono>
          </button>
        ),
      },
      {
        id: "lines",
        meta: { numeric: true },
        header: headerLabel("السطور"),
        cell: ({ row }) => <Mono>{row.original.lines_count}</Mono>,
      },
      {
        id: "amount",
        meta: { numeric: true },
        header: headerLabel("المبلغ"),
        cell: ({ row }) => <Money value={row.original.display_amount} />,
      },
      {
        id: "method",
        header: headerLabel("الاسترجاع"),
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{RETURN_REFUND_METHOD_LABELS[row.original.refund_method]}</span>,
      },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => <ReturnStatusText status={row.original.status} />,
      },
      {
        id: "location",
        header: headerLabel("الموقع"),
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.location?.name ?? "—"}</span>,
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
    [now, setParams],
  );

  const isFiltered = Boolean(status || q);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="المرتجعات"
        description="طلبات الإرجاع من الطلبات المُنفَّذة: اعتماد أو رفض، وإعادة المخزون لكل سطر."
        actions={
          <>
            <Link href="/dashboard/returns/rma" className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1.5 lg:h-9")}>
              <Truck className="size-4" aria-hidden /> مسار RMA
            </Link>
            {canWrite ? (
              <Link href="/dashboard/returns/new" className={cn(buttonVariants(), "h-11 gap-1.5 lg:h-9")} data-testid="new-return">
                <Plus className="size-4" aria-hidden /> إرجاع جديد
              </Link>
            ) : null}
          </>
        }
      />

      <StatStrip
        label="ملخص المرتجعات"
        items={(["requested", "approved", "processing", "completed", "rejected"] as const).map((s) => ({
          key: s,
          label: RETURN_STATUS_LABELS[s],
          count: counts[s],
          tone: s === "requested" ? ("warning" as const) : undefined,
          active: status === s,
          onSelect: () => set({ status: status === s ? null : s }),
        }))}
      />

      <DataTable<ReturnListItem>
        testId="returns-table"
        caption="طلبات الإرجاع"
        columns={columns}
        data={data?.results}
        getRowId={(r) => String(r.id)}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={PAGE_SIZE}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={isFiltered}
        onRowOpen={(row) => void setParams({ return: row.id })}
        toolbar={
          <FilterBar
            activeCount={status ? 1 : 0}
            onClear={() => set({ q: null, status: null })}
            search={<SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder="رقم الإرجاع أو الطلب أو الهاتف" label="بحث في المرتجعات" />}
          >
            <FilterSelect
              label="الحالة"
              value={status ?? ""}
              onChange={(v) => set({ status: (v || null) as (typeof RETURN_STATUSES)[number] | null })}
              options={RETURN_STATUSES.map((s) => ({ value: s, label: RETURN_STATUS_LABELS[s] }))}
              testId="filter-status"
            />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <button type="button" onClick={() => router.push(`/dashboard/returns/${r.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="return-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline gap-2">
                <Mono className="text-sm font-medium">#{r.id}</Mono>
                <span className="truncate text-sm">{r.customer_name}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ReturnStatusText status={r.status} className="text-xs" />
                <span>
                  طلب <Mono>#{r.order_id}</Mono>
                </span>
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Money value={r.display_amount} className="text-sm" />
              <time dateTime={r.created_at} className="text-[11px] text-muted-foreground">
                {formatRelative(r.created_at, now)}
              </time>
            </span>
          </button>
        )}
        emptyState={
          <EmptyState
            title="لا طلبات إرجاع — تُنشأ من تفاصيل الطلب"
            description="افتح طلباً مُنفَّذاً واختر «إرجاع»، أو ابدأ من «إرجاع جديد» برقم الطلب."
            action={
              canWrite ? (
                <Link href="/dashboard/returns/new" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
                  إرجاع جديد
                </Link>
              ) : undefined
            }
          />
        }
        noResultsState={
          <EmptyState
            title="لا مرتجعات تطابق البحث أو الحالة"
            action={
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} onClick={() => set({ q: null, status: null })} data-testid="clear-filters">
                مسح الفلاتر
              </button>
            }
          />
        }
      />

      <Sheet open={openId !== null} onOpenChange={(o) => !o && void setParams({ return: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-2xl" data-testid="return-sheet">
          <SheetTitle className="sr-only">تفاصيل الإرجاع {openId ?? ""}</SheetTitle>
          <SheetDescription className="sr-only">السطور والقرار والجدول الزمني</SheetDescription>
          {openId !== null ? (
            <div className="flex flex-col gap-4">
              <ReturnDetailView key={openId} returnId={openId} variant="sheet" />
              <Link href={`/dashboard/returns/${openId}`} className="inline-flex h-11 items-center self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
                فتح في صفحة كاملة
              </Link>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
