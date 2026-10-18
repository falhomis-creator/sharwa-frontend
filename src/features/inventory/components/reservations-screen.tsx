"use client";

import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AccessGate } from "@/components/shared/access-gate";
import { Button } from "@/components/ui/button";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useReservations } from "@/features/inventory/api";
import { reservationFilterParsers } from "@/features/inventory/hooks/use-inventory-filters";
import { InventoryNav } from "@/features/inventory/components/inventory-nav";
import { formatQty, RESERVATION_STATUS_LABELS, RESERVATION_STATUSES, type Reservation } from "@/features/inventory/schemas";

/**
 * `/dashboard/inventory/reservations` (M21 US-21.6): what is held and why — the gap
 * between «الفعلي» and «المتاح». Each row links to the order (or auction) holding it.
 */
const STATUS_DOT: Record<Reservation["status"], string> = { active: "bg-warning", consumed: "bg-muted-foreground", released: "bg-success" };

export function ReservationsScreen() {
  return (
    <AccessGate feature="inventory" permission="inventory.view">
      <ReservationsTable />
    </AccessGate>
  );
}

function referenceHref(ref: Reservation["reference"]): string | null {
  if (ref.type === "order") return `/dashboard/orders?order=${ref.id}`;
  if (ref.type === "auction") return `/dashboard/products/${ref.id}`;
  return null;
}

function ReservationsTable() {
  const table = useTableUrlState();
  const [filters, setFilters] = useQueryStates(reservationFilterParsers, { history: "replace" });
  const params = { status: filters.status ?? undefined, product: filters.product ?? undefined, page: table.page, page_size: table.pageSize };
  const query = useReservations(params);
  const data = query.data;
  const activeCount = Number(Boolean(filters.status)) + Number(Boolean(filters.product));
  const clear = () => setFilters({ status: null, product: null });
  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<Reservation, unknown>[]>(
    () => [
      {
        id: "product",
        header: headerLabel("المنتج"),
        cell: ({ row }) => (
          <span className="flex min-w-40 flex-col leading-tight">
            <Link href={`/dashboard/products/${row.original.product_id}`} className="truncate hover:underline">
              {row.original.product_name}
            </Link>
            {row.original.variant_label ? <span className="text-[11px] text-muted-foreground">{row.original.variant_label}</span> : null}
          </span>
        ),
      },
      { id: "location", header: headerLabel("الموقع"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.location_name ?? "—"}</span> },
      { id: "quantity", meta: { numeric: true }, header: headerLabel("الكمية"), cell: ({ row }) => <Mono>{formatQty(row.original.quantity)}</Mono> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[row.original.status])} />
            {RESERVATION_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        id: "reference",
        header: headerLabel("المرجع"),
        cell: ({ row }) => {
          const href = referenceHref(row.original.reference);
          return href ? (
            <Link href={href} className="whitespace-nowrap underline underline-offset-4 hover:text-foreground">
              {row.original.reference.label}
            </Link>
          ) : (
            <span className="whitespace-nowrap text-muted-foreground">{row.original.reference.label}</span>
          );
        },
      },
      {
        id: "created_at",
        header: headerLabel("منذ"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} className="whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </time>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="الحجوزات" description="الكمية المحجوزة لطلبات لم تُشحن بعد — الفرق بين الفعلي والمتاح للبيع." />
      <InventoryNav />

      <DataTable<Reservation>
        testId="reservations-table"
        caption="حجوزات المخزون"
        columns={columns}
        data={data?.results}
        getRowId={(r) => String(r.id)}
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
        isFiltered={activeCount > 0}
        emptyState={<EmptyState title="لا حجوزات" description="يُحجز المخزون تلقائياً عند تأكيد الطلب ويُفرَج عند الشحن أو الإلغاء." />}
        noResultsState={
          <EmptyState
            title="لا حجوزات تطابق الفلاتر"
            action={
              <Button variant="outline" className="h-11 lg:h-9" onClick={() => void clear()}>
                مسح الفلاتر
              </Button>
            }
          />
        }
        renderMobileCard={(r) => (
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.product_name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.reference.label}
                {r.location_name ? ` · ${r.location_name}` : ""}
              </span>
            </span>
            <span className="flex flex-col items-end gap-0.5 text-sm">
              <Mono>{formatQty(r.quantity)}</Mono>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[r.status])} />
                {RESERVATION_STATUS_LABELS[r.status]}
              </span>
            </span>
          </div>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear}>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => set({ status: (v || null) as Reservation["status"] | null })} options={RESERVATION_STATUSES.map((s) => ({ value: s, label: RESERVATION_STATUS_LABELS[s] }))} testId="filter-reservation-status" />
          </FilterBar>
        }
      />
    </div>
  );
}
