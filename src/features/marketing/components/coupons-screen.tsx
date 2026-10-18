"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, headerLabel } from "@/components/shared/data-table/data-table";
import { FilterBar, FilterSelect, SearchBox } from "@/components/shared/data-table/filter-bar";
import { useTableUrlState } from "@/components/shared/data-table/use-table-url-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCoupons } from "@/features/marketing/api";
import { BackToHub, StateText } from "@/features/marketing/components/shared";
import { APPLY_TO_LABELS, couponState, DISCOUNT_TYPE_LABELS, TEMPORAL_STATES, TEMPORAL_STATE_LABELS, type Coupon } from "@/features/marketing/schemas";
import { formatDate } from "@/lib/format";

/** US-13.2.1 — coupon list. Code in Mono, usage «used/max», temporal state as text (FR-13.02). */
const filterParsers = { q: parseAsString.withDefault(""), status: parseAsStringLiteral(TEMPORAL_STATES) };

const newButtonClass = "inline-flex h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 lg:h-9";

export function CouponsScreen() {
  return (
    <AccessGate feature="coupon" permission="discounts.apply">
      <CouponsInner />
    </AccessGate>
  );
}

function applyToText(c: Coupon) {
  if (c.apply_to === "category") return `تصنيف: ${c.category?.name ?? "—"}`;
  if (c.apply_to === "product") return `منتج: ${c.product?.name ?? "—"}`;
  return APPLY_TO_LABELS.all;
}

function CouponsInner() {
  const router = useRouter();
  const { canPermission } = useAccess();
  const canManage = canPermission("discounts.manage");
  const [filters, setFilters] = useQueryStates(filterParsers, { history: "replace" });
  const table = useTableUrlState();
  const params = { q: filters.q || undefined, status: filters.status ?? undefined, page: table.page, page_size: table.pageSize };
  const list = useCoupons(params);
  const isFiltered = !!filters.q || !!filters.status;

  const columns = useMemo<ColumnDef<Coupon, unknown>[]>(
    () => [
      { id: "code", meta: { className: "whitespace-nowrap" }, header: headerLabel("الكود"), cell: ({ row }) => <Mono className="font-medium">{row.original.code}</Mono> },
      { id: "value", header: headerLabel("الخصم"), cell: ({ row }) => (<span className="whitespace-nowrap"><Mono>{row.original.display_discount}</Mono> <span className="text-xs text-muted-foreground">{DISCOUNT_TYPE_LABELS[row.original.discount_type]}</span></span>) },
      { id: "apply_to", header: headerLabel("يطبَّق على"), cell: ({ row }) => <span className="truncate">{applyToText(row.original)}</span> },
      { id: "usage", meta: { numeric: true }, header: headerLabel("الاستخدام"), cell: ({ row }) => (<Mono>{row.original.used_count}/{row.original.max_uses === null ? <span className="font-sans text-xs text-muted-foreground">غير محدود</span> : row.original.max_uses}</Mono>) },
      { id: "validity", header: headerLabel("الصلاحية"), cell: ({ row }) => (<span className="whitespace-nowrap text-xs text-muted-foreground">{row.original.start_date ? formatDate(row.original.start_date) : "—"} → {row.original.expires_at ? formatDate(row.original.expires_at) : "بلا نهاية"}</span>) },
      { id: "state", header: headerLabel("الحالة"), cell: ({ row }) => <StateText state={couponState(row.original)} /> },
      { id: "influencer", header: headerLabel("مؤثر"), cell: ({ row }) => (row.original.influencer ? <Link href={`/dashboard/influencers/${row.original.influencer.id}`} onClick={(e) => e.stopPropagation()} className="text-xs hover:underline">{row.original.influencer.name}</Link> : <span className="text-xs text-muted-foreground">—</span>) },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5" data-testid="coupons-screen">
      <BackToHub />
      <PageHeader title="الكوبونات" description="أكواد خصم يدخلها العميل عند الدفع." actions={canManage ? <Link href="/dashboard/marketing/coupons/new" className={newButtonClass} data-testid="new-coupon">كوبون جديد</Link> : null} />
      <DataTable
        columns={columns}
        data={list.data?.results}
        getRowId={(c) => String(c.id)}
        caption="الكوبونات"
        total={list.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        isFiltered={isFiltered}
        emptyState={<EmptyState title="لا كوبونات بعد" description="أنشئ أول كود خصم ليدخله عملاؤك عند الدفع." action={canManage ? <Link href="/dashboard/marketing/coupons/new" className={newButtonClass}>كوبون جديد</Link> : null} />}
        noResultsState={<EmptyState title="لا نتائج مطابقة" description="غيّر البحث أو الفلتر." />}
        onRowOpen={(c) => router.push(`/dashboard/marketing/coupons/${c.id}`)}
        toolbar={
          <FilterBar
            search={<SearchBox value={filters.q} onChange={(q) => { void setFilters({ q: q || null }); table.resetPage(); }} placeholder="ابحث بالكود أو اسم المؤثر" />}
            activeCount={Number(!!filters.status)}
            onClear={() => { void setFilters({ q: null, status: null }); table.resetPage(); }}
          >
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => { void setFilters({ status: (v || null) as typeof filters.status }); table.resetPage(); }} options={TEMPORAL_STATES.map((s) => ({ value: s, label: TEMPORAL_STATE_LABELS[s] }))} testId="coupon-status" />
          </FilterBar>
        }
        renderMobileCard={(c) => (
          <button type="button" onClick={() => router.push(`/dashboard/marketing/coupons/${c.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="coupon-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline gap-2"><Mono className="text-sm font-medium">{c.code}</Mono><span className="text-xs text-muted-foreground">{applyToText(c)}</span></span>
              <StateText state={couponState(c)} className="text-xs" />
            </span>
            <span className="flex flex-col items-end gap-1 text-xs"><Mono className="text-sm">{c.display_discount}</Mono><Mono className="text-muted-foreground">{c.used_count}/{c.max_uses ?? "∞"}</Mono></span>
          </button>
        )}
        testId="coupons-table"
      />
    </div>
  );
}
