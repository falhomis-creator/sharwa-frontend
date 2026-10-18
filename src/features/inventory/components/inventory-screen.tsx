"use client";

import { ChevronDown, Download } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { addDecimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { useOrderFormOptions } from "@/features/orders/api";
import { useCategories } from "@/features/organization/api";
import { UNIT_LABELS } from "@/features/products/schemas/enums";
import { inventoryKeys, useInventory, useInventoryCounters } from "@/features/inventory/api";
import { useInventoryFilters } from "@/features/inventory/hooks/use-inventory-filters";
import { AdjustPanel } from "@/features/inventory/components/adjust-panel";
import { InventoryNav } from "@/features/inventory/components/inventory-nav";
import { formatQty, STOCK_STATUSES, STOCK_STATUS_LABELS, type InventoryList, type InventoryUnit, type StockStatus } from "@/features/inventory/schemas";

/**
 * `/dashboard/inventory` (M21 US-21.1/21.2/21.4, T118): one truthful number per
 * product/variant/location. Parent rows expand to their variants with no extra request
 * (SC-21.3); the location filter switches the columns to the location's four quantities
 * and says so in the header («المصدر: مخزون الموقع», FR-21.03). A click on a quantity opens
 * the adjust panel (with `inventory.adjust`); the row updates optimistically and rolls
 * back on 4xx/409 (FR-21.07).
 */
type Row = InventoryUnit & { kind: "product" | "variant"; expandable: boolean; expanded: boolean; variantCount: number };

export const STATUS_DOT: Record<StockStatus, string> = {
  in_stock: "bg-success",
  low: "bg-warning",
  out: "bg-destructive",
  backorder: "bg-info",
};

export function StatusDot({ status }: { status: StockStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}

const rowId = (u: Pick<InventoryUnit, "product_id" | "variant_id">) => `${u.product_id}:${u.variant_id ?? 0}`;

export function InventoryScreen() {
  return (
    <AccessGate feature="inventory" permission="inventory.view">
      <InventoryTable />
    </AccessGate>
  );
}

function InventoryTable() {
  const store = useStore();
  const client = useQueryClient();
  const table = useTableUrlState();
  const { filters, setFilters, activeCount, isFiltered, clear } = useInventoryFilters();
  const { canPermission } = useAccess();
  const canAdjust = canPermission("inventory.adjust");
  const canExport = canPermission("reports.export");
  const canProfit = canPermission("reports.profit.view");
  const counters = useInventoryCounters().data;
  const locations = useOrderFormOptions().data?.locations ?? [];
  const categories = useCategories().data ?? [];
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const params = {
    q: filters.q || undefined,
    status: filters.status ?? undefined,
    location: filters.location || undefined,
    category: filters.category || undefined,
    is_serialized: filters.is_serialized || undefined,
    page: table.page,
    page_size: table.pageSize,
  };
  const query = useInventory(params);
  const data = query.data;
  const multi = data?.multi_location ?? false;
  const byLocation = data?.source === "location";

  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
  };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const p of data?.results ?? []) {
      const isOpen = expanded[p.product_id] ?? false;
      out.push({ ...p, kind: "product", expandable: p.variants.length > 0, expanded: isOpen, variantCount: p.variants.length });
      if (isOpen) for (const v of p.variants) out.push({ ...v, kind: "variant", expandable: false, expanded: false, variantCount: 0 });
    }
    return out;
  }, [data, expanded]);

  const adjusting = useMemo<InventoryUnit | null>(() => {
    if (!filters.adjust) return null;
    return rows.find((r) => rowId(r) === filters.adjust) ?? null;
  }, [filters.adjust, rows]);

  const openAdjust = (u: InventoryUnit) => void setFilters({ adjust: rowId(u) });

  /** Optimistic: the cached list gets the delta at once; the invalidation that follows settles it (FR-21.07). */
  const applied = (unit: InventoryUnit, delta: string) => {
    client.setQueryData<InventoryList>(inventoryKeys(store).list(params), (old) => {
      if (!old) return old;
      const bump = (u: InventoryUnit): InventoryUnit =>
        u.product_id === unit.product_id && u.variant_id === unit.variant_id
          ? { ...u, stock: addDecimal(u.stock, delta, 3), location: u.location ? { ...u.location, on_hand: addDecimal(u.location.on_hand, delta, 3), available: addDecimal(u.location.available, delta, 3) } : null }
          : u;
      return {
        ...old,
        results: old.results.map((p) => {
          const variants = p.variants.map(bump);
          const parent = bump(p);
          if (variants.length && variants.some((v, i) => v !== p.variants[i])) {
            return { ...parent, stock: addDecimal(p.stock, delta, 3), variants };
          }
          return { ...parent, variants };
        }),
      };
    });
  };

  const blockedReason = (u: InventoryUnit): string | null => {
    if (!canAdjust) return "تحتاج صلاحية تعديل المخزون";
    if (u.is_serialized) return "المنتجات المسلسلة تُدار بالوحدات";
    if (u.is_bundle) return "محسوب من المكوّنات";
    if (u.is_auction) return "مخزون المزاد ثابت على 1";
    return null;
  };

  const qtyCell = (u: Row, value: string) => {
    const reason = blockedReason(u);
    const parentOfVariants = u.kind === "product" && u.expandable;
    if (reason || parentOfVariants) {
      return (
        <span title={reason ?? "المجموع — عدّل كل متغير على حدة"} className="inline-flex items-center gap-1.5">
          <Mono className={cn(parentOfVariants && "text-muted-foreground")}>{formatQty(value, u.unit)}</Mono>
          {u.is_serialized && u.kind === "product" ? (
            <Link href={`/dashboard/inventory/items?product=${u.product_id}`} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              إدارة الوحدات
            </Link>
          ) : null}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openAdjust(u);
        }}
        className="inline-flex min-h-11 items-center rounded-md px-1.5 font-mono tabular-nums underline decoration-dotted underline-offset-4 hover:bg-muted lg:min-h-7"
        aria-label={`تعديل كمية ${u.name}${u.variant_label ? ` ${u.variant_label}` : ""}`}
        data-testid="qty-button"
        dir="ltr"
      >
        {formatQty(value, u.unit)}
      </button>
    );
  };

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => {
    const cols: ColumnDef<Row, unknown>[] = [
      {
        id: "name",
        header: headerLabel("المنتج"),
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "variant") {
            return (
              <span className="flex min-w-40 items-center gap-2 ps-6 text-muted-foreground">
                <span aria-hidden className="h-px w-3 bg-border" />
                <span className="truncate text-foreground">{r.variant_label}</span>
              </span>
            );
          }
          return (
            <span className="flex min-w-40 items-center gap-2">
              {r.expandable ? (
                <button
                  type="button"
                  aria-expanded={r.expanded}
                  aria-label={`${r.expanded ? "طيّ" : "توسيع"} متغيرات ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((x) => ({ ...x, [r.product_id]: !r.expanded }));
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-7"
                  data-testid="expand-variants"
                >
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform", r.expanded && "rotate-180")} />
                </button>
              ) : (
                <span className="size-9 shrink-0 lg:size-7" aria-hidden />
              )}
              <span className="flex min-w-0 flex-col leading-tight">
                <Link href={`/dashboard/products/${r.product_id}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">
                  {r.name}
                </Link>
                {r.expandable ? <span className="text-[11px] text-muted-foreground">{r.variantCount} متغيرات</span> : null}
              </span>
            </span>
          );
        },
      },
      {
        id: "sku",
        header: headerLabel("SKU"),
        cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{row.original.sku}</Mono>,
      },
      {
        id: "unit",
        header: headerLabel("الوحدة"),
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{UNIT_LABELS[row.original.unit]}</span>,
      },
    ];
    if (byLocation) {
      cols.push(
        { id: "on_hand", meta: { numeric: true }, header: headerLabel("الفعلي"), cell: ({ row }) => (row.original.location ? qtyCell(row.original, row.original.location.on_hand) : <span className="text-muted-foreground">—</span>) },
        { id: "reserved", meta: { numeric: true }, header: headerLabel("المحجوز"), cell: ({ row }) => (row.original.location ? <Mono className="text-muted-foreground">{formatQty(row.original.location.reserved, row.original.unit)}</Mono> : "—") },
        { id: "quarantine", meta: { numeric: true }, header: headerLabel("الحجر"), cell: ({ row }) => (row.original.location ? <Mono className="text-muted-foreground">{formatQty(row.original.location.quarantine, row.original.unit)}</Mono> : "—") },
        { id: "available", meta: { numeric: true }, header: headerLabel("المتاح"), cell: ({ row }) => (row.original.location ? <Mono>{formatQty(row.original.location.available, row.original.unit)}</Mono> : <span className="text-muted-foreground" title="لا صف مخزون لهذا المنتج في الموقع — عيّنه من صفحة الموقع">—</span>) },
      );
    } else {
      cols.push(
        { id: "stock", meta: { numeric: true }, header: headerLabel("الكمية"), cell: ({ row }) => qtyCell(row.original, row.original.stock) },
        { id: "reserved_total", meta: { numeric: true }, header: headerLabel("المحجوز"), cell: ({ row }) => <Mono className="text-muted-foreground">{formatQty(row.original.reserved_total, row.original.unit)}</Mono> },
      );
    }
    cols.push(
      { id: "threshold", meta: { numeric: true }, header: headerLabel("حد التنبيه"), cell: ({ row }) => <Mono className="text-muted-foreground">{row.original.low_stock_threshold}</Mono> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <StatusDot status={row.original.status} /> },
    );
    if (canProfit) {
      cols.push({ id: "cost", meta: { numeric: true }, header: headerLabel("التكلفة"), cell: ({ row }) => <Money value={row.original.cost_price} muted /> });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- qtyCell closes over stable callbacks
  }, [byLocation, canProfit, canAdjust]);

  const exportHref = `/api/bff/inventory/export.csv?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="المخزون"
        description="رقم واحد صادق لكل منتج ومتغير وموقع: الفعلي، المحجوز، والمتاح للبيع — وكل تغيير بسبب."
        actions={
          <>
            {canExport ? (
              <a href={exportHref} className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="export-csv">
                <Download className="size-4" aria-hidden /> تصدير CSV
              </a>
            ) : (
              <Button variant="outline" className="h-11 lg:h-9" disabled title="تحتاج صلاحية تصدير التقارير">
                <Download className="size-4" aria-hidden /> تصدير CSV
              </Button>
            )}
          </>
        }
      />
      <InventoryNav />

      <StatStrip
        label="ملخص المخزون"
        items={[
          { key: "in_stock", label: "متوفر", count: counters?.in_stock, active: filters.status === "in_stock", onSelect: () => set({ status: filters.status === "in_stock" ? null : "in_stock" }) },
          { key: "low", label: "منخفض", count: counters?.low, tone: "warning", active: filters.status === "low", onSelect: () => set({ status: filters.status === "low" ? null : "low" }) },
          { key: "out", label: "نفد", count: counters?.out, tone: "destructive", active: filters.status === "out", onSelect: () => set({ status: filters.status === "out" ? null : "out" }) },
          { key: "backorder", label: "يقبل الحجز", count: counters?.backorder, active: filters.status === "backorder", onSelect: () => set({ status: filters.status === "backorder" ? null : "backorder" }) },
        ]}
      />

      {byLocation ? (
        <p className="text-xs text-muted-foreground" data-testid="source-hint">
          المصدر: مخزون الموقع «{locations.find((l) => String(l.id) === filters.location)?.name ?? filters.location}» — الفعلي − المحجوز − الحجر = المتاح.
        </p>
      ) : null}

      <DataTable<Row>
        testId="inventory-table"
        caption="جدول المخزون"
        columns={columns}
        data={rows}
        getRowId={rowId}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={isFiltered}
        emptyState={
          <EmptyState
            title="لا منتجات بعد — أضف منتجك الأول"
            description="يظهر المخزون هنا فور إضافة أول منتج."
            action={
              <Link href="/dashboard/products/new" className="inline-flex h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:h-9">
                منتج جديد
              </Link>
            }
          />
        }
        noResultsState={
          <EmptyState
            title="لا منتجات تطابق الفلاتر"
            action={
              <Button variant="outline" className="h-11 lg:h-9" onClick={() => void clear()}>
                مسح الفلاتر
              </Button>
            }
          />
        }
        onRowOpen={(row) => {
          if (row.expandable) setExpanded((x) => ({ ...x, [row.product_id]: !row.expanded }));
          else if (!blockedReason(row)) openAdjust(row);
        }}
        renderMobileCard={(r) => (
          <div className={cn("flex flex-col gap-1.5 py-3", r.kind === "variant" && "ps-5")}>
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.kind === "variant" ? r.variant_label : r.name}</span>
                <Mono className="text-[11px] text-muted-foreground">{r.sku}</Mono>
              </span>
              <StatusDot status={r.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{byLocation ? "المتاح / الفعلي" : "الكمية"}</span>
              <span className="flex items-center gap-2">
                {byLocation && r.location ? <Mono className="text-muted-foreground">{formatQty(r.location.available, r.unit)} /</Mono> : null}
                {qtyCell(r, byLocation ? (r.location?.on_hand ?? "0") : r.stock)}
              </span>
            </div>
            {r.expandable ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center self-start text-xs text-muted-foreground underline underline-offset-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((x) => ({ ...x, [r.product_id]: !r.expanded }));
                }}
              >
                {r.expanded ? "طيّ المتغيرات" : `عرض ${r.variantCount} متغيرات`}
              </button>
            ) : null}
          </div>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear} search={<SearchBox value={filters.q} onChange={(q) => set({ q: q || null })} placeholder="الاسم أو SKU أو الباركود" label="بحث في المخزون" />}>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => set({ status: (v || null) as StockStatus | null })} options={STOCK_STATUSES.map((s) => ({ value: s, label: STOCK_STATUS_LABELS[s] }))} testId="filter-status" />
            {multi ? (
              <FilterSelect label="الموقع" value={filters.location} onChange={(v) => set({ location: v || null })} options={locations.map((l) => ({ value: String(l.id), label: l.name }))} allLabel="كل المواقع" testId="filter-location" />
            ) : null}
            <FilterSelect label="التصنيف" value={filters.category} onChange={(v) => set({ category: v || null })} options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />
            <FilterSelect label="النوع" value={filters.is_serialized} onChange={(v) => set({ is_serialized: v || null })} options={[{ value: "true", label: "مسلسل" }, { value: "false", label: "غير مسلسل" }]} />
          </FilterBar>
        }
      />

      <AdjustPanel unit={adjusting} multi={multi} locations={locations} defaultLocation={filters.location} onClose={() => void setFilters({ adjust: null })} onApplied={applied} />
    </div>
  );
}
