"use client";

import Link from "next/link";
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
import { useOrderFormOptions } from "@/features/orders/api";
import { useMovements } from "@/features/inventory/api";
import { useMovementFilters } from "@/features/inventory/hooks/use-inventory-filters";
import { InventoryNav } from "@/features/inventory/components/inventory-nav";
import { formatDelta, formatQty, MOVEMENT_REASON_LABELS, MOVEMENT_REASONS, type Movement, type MovementReason } from "@/features/inventory/schemas";

/**
 * `/dashboard/inventory/movements` (M21 US-21.3, FR-21.05): the append-only ledger. Each
 * row says who, when, why, how much, and the quantity after — a reference links to the
 * order (`/dashboard/orders?order=<id>`) or the approval that caused it. Newest first.
 */
export function MovementsScreen() {
  return (
    <AccessGate feature="inventory" permission="inventory.view">
      <MovementsTable />
    </AccessGate>
  );
}

function referenceHref(ref: NonNullable<Movement["reference"]>): string | null {
  if (ref.type === "order") return `/dashboard/orders?order=${ref.id}`;
  if (ref.type === "approval") return `/dashboard/staff/approvals?approval=${ref.id}`;
  if (ref.type === "purchase_order") return `/dashboard/purchase-orders/${ref.id}`;
  return null;
}

function MovementsTable() {
  const table = useTableUrlState();
  const { filters, setFilters, activeCount, isFiltered, clear } = useMovementFilters();
  const locations = useOrderFormOptions().data?.locations ?? [];
  const params = {
    product: filters.product ?? undefined,
    variant: filters.variant ?? undefined,
    location: filters.location || undefined,
    reason: filters.reason ?? undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: table.page,
    page_size: table.pageSize,
  };
  const query = useMovements(params);
  const data = query.data;
  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
  };
  const multi = locations.length > 0;

  const columns = useMemo<ColumnDef<Movement, unknown>[]>(
    () => [
      {
        id: "created_at",
        header: headerLabel("الوقت"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} className="whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </time>
        ),
      },
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
      ...(multi
        ? [{ id: "location", header: headerLabel("الموقع"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.location_name ?? "—"}</span> } satisfies ColumnDef<Movement, unknown>]
        : []),
      {
        id: "delta",
        meta: { numeric: true },
        header: headerLabel("التغيير"),
        cell: ({ row }) => <DeltaCell delta={row.original.delta} />,
      },
      {
        id: "after",
        meta: { numeric: true },
        header: headerLabel("بعد"),
        cell: ({ row }) => <Mono className="text-muted-foreground">{formatQty(row.original.quantity_after)}</Mono>,
      },
      {
        id: "reason",
        header: headerLabel("السبب"),
        cell: ({ row }) => (
          <span className="flex min-w-36 flex-col leading-tight">
            <span>{MOVEMENT_REASON_LABELS[row.original.reason]}</span>
            {row.original.note ? <span className="truncate text-[11px] text-muted-foreground">{row.original.note}</span> : null}
          </span>
        ),
      },
      {
        id: "reference",
        header: headerLabel("المرجع"),
        cell: ({ row }) => {
          const ref = row.original.reference;
          if (!ref) return <span className="text-muted-foreground">—</span>;
          const href = referenceHref(ref);
          return href ? (
            <Link href={href} className="whitespace-nowrap underline underline-offset-4 hover:text-foreground" data-testid="movement-reference">
              {ref.label}
            </Link>
          ) : (
            <span className="whitespace-nowrap text-muted-foreground">{ref.label}</span>
          );
        },
      },
      { id: "actor", header: headerLabel("بواسطة"), cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.actor}</span> },
    ],
    [multi],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="سجل الحركات" description="دفتر لا يُمحى: كل تغيير في الكمية مع سببه ومن أجراه." />
      <InventoryNav />

      <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="movements-summary">
        <Mono className="text-foreground">{data?.count ?? "—"}</Mono> حركة
        {data ? (
          <>
            {" "}
            · صافي التغيير <DeltaCell delta={data.net_delta} />
          </>
        ) : null}
        {filters.product ? (
          <>
            {" "}
            · <button type="button" className="underline underline-offset-4" onClick={() => set({ product: null, variant: null })}>كل المنتجات</button>
          </>
        ) : null}
      </p>

      <DataTable<Movement>
        testId="movements-table"
        caption="سجل حركات المخزون"
        columns={columns}
        data={data?.results}
        getRowId={(m) => String(m.id)}
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
        emptyState={<EmptyState title="لا حركات بعد" description="تظهر هنا كل زيادة أو نقصان في المخزون فور حدوثها." />}
        noResultsState={
          <EmptyState
            title="لا حركات تطابق الفلاتر"
            action={
              <Button variant="outline" className="h-11 lg:h-9" onClick={() => void clear()}>
                مسح الفلاتر
              </Button>
            }
          />
        }
        renderMobileCard={(m) => (
          <div className="flex flex-col gap-1 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.product_name}</span>
                {m.variant_label ? <span className="text-[11px] text-muted-foreground">{m.variant_label}</span> : null}
              </span>
              <DeltaCell delta={m.delta} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{MOVEMENT_REASON_LABELS[m.reason]}</span>
              <span aria-hidden>·</span>
              <span>{m.actor}</span>
              <span aria-hidden>·</span>
              <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
            </div>
          </div>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={clear}>
            <FilterSelect label="السبب" value={filters.reason ?? ""} onChange={(v) => set({ reason: (v || null) as MovementReason | null })} options={MOVEMENT_REASONS.map((r) => ({ value: r, label: MOVEMENT_REASON_LABELS[r] }))} testId="filter-reason" />
            {multi ? <FilterSelect label="الموقع" value={filters.location} onChange={(v) => set({ location: v || null })} options={locations.map((l) => ({ value: String(l.id), label: l.name }))} allLabel="كل المواقع" /> : null}
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">من</span>
              <input type="date" dir="ltr" value={filters.from} onChange={(e) => set({ from: e.target.value || null })} className="h-11 rounded-lg border border-border bg-card px-2 text-sm md:h-8" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">إلى</span>
              <input type="date" dir="ltr" value={filters.to} onChange={(e) => set({ to: e.target.value || null })} className="h-11 rounded-lg border border-border bg-card px-2 text-sm md:h-8" />
            </label>
          </FilterBar>
        }
      />
    </div>
  );
}

export function DeltaCell({ delta, unit }: { delta: string; unit?: string }) {
  const n = Number(delta);
  return (
    <Mono className={cn("whitespace-nowrap", n > 0 ? "text-success" : n < 0 ? "text-destructive" : "text-muted-foreground")} data-testid="delta">
      {formatDelta(delta, unit)}
    </Mono>
  );
}
