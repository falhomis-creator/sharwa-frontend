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
import { useOffers } from "@/features/marketing/api";
import { BackToHub, StateText } from "@/features/marketing/components/shared";
import { OFFER_TYPE_LABELS, OFFER_TYPES, offerState, TEMPORAL_STATES, TEMPORAL_STATE_LABELS, type Offer } from "@/features/marketing/schemas";
import { formatDate } from "@/lib/format";

/** US-13.2.2 — offers sorted by priority; «الأعلى أولوية يُطبَّق أولاً» (FR-13.03). */
const filterParsers = { q: parseAsString.withDefault(""), status: parseAsStringLiteral(TEMPORAL_STATES), offer_type: parseAsStringLiteral(OFFER_TYPES) };
const newButtonClass = "inline-flex h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 lg:h-9";

export function offerSummary(o: Offer): string {
  if (o.offer_type === "free_shipping") return o.display_min_order_amount ? `شحن مجاني فوق ${o.display_min_order_amount}` : "شحن مجاني";
  if (o.offer_type === "discount") return `${o.display_discount ?? ""}${o.display_min_order_amount ? ` فوق ${o.display_min_order_amount}` : ""}`;
  const cond = o.buy_condition_type === "category" ? `من ${o.buy_category?.name ?? "تصنيف"}` : o.buy_condition_type === "product" ? `من ${o.buy_product?.name ?? "منتج"}` : o.buy_condition_type === "min_items" ? `(${o.min_total_items ?? "?"} عناصر على الأقل)` : "من أي منتج";
  return `اشترِ ${o.buy_quantity ?? "?"} ${cond} واحصل على ${o.get_quantity ?? "?"} × ${o.get_product?.name ?? "منتج"} بخصم ${o.get_discount_percent ?? "?"}%`;
}

export function OffersScreen() {
  return (
    <AccessGate feature="promotions" permission="discounts.apply">
      <OffersInner />
    </AccessGate>
  );
}

function OffersInner() {
  const router = useRouter();
  const { canPermission } = useAccess();
  const canManage = canPermission("discounts.manage");
  const [filters, setFilters] = useQueryStates(filterParsers, { history: "replace" });
  const table = useTableUrlState();
  const params = { q: filters.q || undefined, status: filters.status ?? undefined, offer_type: filters.offer_type ?? undefined };
  const list = useOffers(params);
  const isFiltered = !!filters.q || !!filters.status || !!filters.offer_type;

  const columns = useMemo<ColumnDef<Offer, unknown>[]>(
    () => [
      { id: "priority", meta: { numeric: true, className: "w-16" }, header: headerLabel("الأولوية"), cell: ({ row }) => <Mono>{row.original.priority}</Mono> },
      { id: "name", header: headerLabel("العرض"), cell: ({ row }) => (<span className="flex min-w-48 flex-col leading-tight"><span className="truncate font-medium">{row.original.name}</span><span className="truncate text-xs text-muted-foreground">{offerSummary(row.original)}</span></span>) },
      { id: "type", header: headerLabel("النوع"), cell: ({ row }) => <span className="whitespace-nowrap text-xs">{OFFER_TYPE_LABELS[row.original.offer_type]}</span> },
      { id: "validity", header: headerLabel("الصلاحية"), cell: ({ row }) => (<span className="whitespace-nowrap text-xs text-muted-foreground">{row.original.valid_from ? formatDate(row.original.valid_from) : "—"} → {row.original.valid_until ? formatDate(row.original.valid_until) : "بلا نهاية"}</span>) },
      { id: "state", header: headerLabel("الحالة"), cell: ({ row }) => <StateText state={offerState(row.original)} /> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5" data-testid="offers-screen">
      <BackToHub />
      <PageHeader title="العروض الترويجية" description="تُطبَّق تلقائياً في السلة وتظهر في واجهة المتجر. الأعلى أولوية يُطبَّق أولاً." actions={canManage ? <Link href="/dashboard/marketing/offers/new" className={newButtonClass} data-testid="new-offer">عرض جديد</Link> : null} />
      <DataTable
        columns={columns}
        data={list.data?.results}
        getRowId={(o) => String(o.id)}
        caption="العروض الترويجية"
        total={list.data?.count ?? 0}
        page={1}
        pageSize={100}
        onPageChange={() => undefined}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        isFiltered={isFiltered}
        emptyState={<EmptyState title="لا عروض بعد" description="أنشئ عرضاً يُطبَّق تلقائياً في سلة العميل." action={canManage ? <Link href="/dashboard/marketing/offers/new" className={newButtonClass}>عرض جديد</Link> : null} />}
        noResultsState={<EmptyState title="لا نتائج مطابقة" description="غيّر البحث أو الفلتر." />}
        onRowOpen={(o) => router.push(`/dashboard/marketing/offers/${o.id}`)}
        toolbar={
          <FilterBar
            search={<SearchBox value={filters.q} onChange={(q) => void setFilters({ q: q || null })} placeholder="ابحث باسم العرض" />}
            activeCount={Number(!!filters.status) + Number(!!filters.offer_type)}
            onClear={() => void setFilters({ q: null, status: null, offer_type: null })}
          >
            <FilterSelect label="النوع" value={filters.offer_type ?? ""} onChange={(v) => void setFilters({ offer_type: (v || null) as typeof filters.offer_type })} options={OFFER_TYPES.map((t) => ({ value: t, label: OFFER_TYPE_LABELS[t] }))} />
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => void setFilters({ status: (v || null) as typeof filters.status })} options={TEMPORAL_STATES.filter((s) => s !== "exhausted").map((s) => ({ value: s, label: TEMPORAL_STATE_LABELS[s] }))} testId="offer-status" />
          </FilterBar>
        }
        renderMobileCard={(o) => (
          <button type="button" onClick={() => router.push(`/dashboard/marketing/offers/${o.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="offer-card">
            <Mono className="w-6 shrink-0 text-xs text-muted-foreground">{o.priority}</Mono>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-medium">{o.name}</span>
              <span className="truncate text-xs text-muted-foreground">{offerSummary(o)}</span>
            </span>
            <StateText state={offerState(o)} className="text-xs" />
          </button>
        )}
        testId="offers-table"
      />
    </div>
  );
}
