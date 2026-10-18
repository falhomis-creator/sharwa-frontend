"use client";

import Link from "next/link";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { Button } from "@/components/ui/button";
import { DataTable, FilterBar, FilterSelect, headerLabel, SearchBox, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useItems } from "@/features/inventory/api";
import { InventoryNav } from "@/features/inventory/components/inventory-nav";
import { ITEM_STATUS_LABELS, ITEM_STATUSES, type InventoryItem } from "@/features/inventory/schemas";

/**
 * `/dashboard/inventory/items` (M21 US-21.5): serialized units, one row per serial.
 * Reached from the table's «إدارة الوحدات» link (`?product=`); searched by serial number.
 */
const parsers = {
  product: parseAsInteger,
  status: parseAsStringLiteral(ITEM_STATUSES),
  q: parseAsString.withDefault(""),
};

const STATUS_DOT: Record<InventoryItem["status"], string> = { available: "bg-success", reserved: "bg-warning", sold: "bg-muted-foreground" };

export function ItemsScreen() {
  return (
    <AccessGate feature="inventory" permission="inventory.view">
      <ItemsTable />
    </AccessGate>
  );
}

function ItemsTable() {
  const table = useTableUrlState();
  const [filters, setFilters] = useQueryStates(parsers, { history: "replace" });
  const params = { product: filters.product ?? undefined, status: filters.status ?? undefined, q: filters.q || undefined, page: table.page, page_size: table.pageSize };
  const query = useItems(params);
  const data = query.data;
  const activeCount = Number(Boolean(filters.product)) + Number(Boolean(filters.status));
  const isFiltered = activeCount > 0 || Boolean(filters.q);
  const clear = () => setFilters({ product: null, status: null, q: null });
  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
  };
  const productName = data?.results[0]?.product_name;

  const columns = useMemo<ColumnDef<InventoryItem, unknown>[]>(
    () => [
      { id: "serial", header: headerLabel("الرقم التسلسلي"), cell: ({ row }) => <Mono data-testid="serial">{row.original.serial_number}</Mono> },
      {
        id: "product",
        header: headerLabel("المنتج"),
        cell: ({ row }) => (
          <Link href={`/dashboard/products/${row.original.product_id}`} className="whitespace-nowrap hover:underline">
            {row.original.product_name}
          </Link>
        ),
      },
      { id: "location", header: headerLabel("الموقع"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.location_name ?? "—"}</span> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[row.original.status])} />
            {ITEM_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: "order",
        header: headerLabel("الطلب"),
        cell: ({ row }) =>
          row.original.order_id ? (
            <Link href={`/dashboard/orders?order=${row.original.order_id}`} className="underline underline-offset-4 hover:text-foreground">
              <Mono>#{row.original.order_id}</Mono>
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الوحدات المسلسلة" description="كل وحدة برقمها التسلسلي وحالتها وموقعها — المنتجات المسلسلة لا تُعدَّل كمياتها، تُدار وحداتها." />
      <InventoryNav />

      {filters.product ? (
        <p className="text-sm text-muted-foreground" data-testid="items-scope">
          وحدات {productName ? <span className="text-foreground">{productName}</span> : <Mono>#{filters.product}</Mono>} ·{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => set({ product: null })}>
            كل المنتجات
          </button>
        </p>
      ) : null}

      <DataTable<InventoryItem>
        testId="items-table"
        caption="الوحدات المسلسلة"
        columns={columns}
        data={data?.results}
        getRowId={(i) => String(i.id)}
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
        emptyState={<EmptyState title="لا وحدات مسلسلة" description="فعّل «منتج مسلسل» من صفحة المنتج ثم أضف الأرقام التسلسلية." />}
        noResultsState={
          <EmptyState
            title="لا وحدات تطابق البحث"
            action={
              <Button variant="outline" className="h-11 lg:h-9" onClick={() => void clear()}>
                مسح الفلاتر
              </Button>
            }
          />
        }
        renderMobileCard={(i) => (
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <Mono className="block">{i.serial_number}</Mono>
              <span className="block truncate text-xs text-muted-foreground">
                {i.product_name}
                {i.location_name ? ` · ${i.location_name}` : ""}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
              <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[i.status])} />
              {ITEM_STATUS_LABELS[i.status]}
            </span>
          </div>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear} search={<SearchBox value={filters.q} onChange={(q) => set({ q: q || null })} placeholder="الرقم التسلسلي" label="بحث بالرقم التسلسلي" />}>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => set({ status: (v || null) as InventoryItem["status"] | null })} options={ITEM_STATUSES.map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] }))} testId="filter-item-status" />
          </FilterBar>
        }
      />
    </div>
  );
}
