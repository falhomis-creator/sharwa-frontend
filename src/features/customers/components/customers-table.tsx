"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatDateTime, formatNumber, formatRelative, prettyPhone } from "@/lib/format";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCustomers, useSegmentCount } from "@/features/customers/api";
import { useCustomerFilters, useOpenCustomer } from "@/features/customers/hooks/use-customer-filters";
import { SEGMENTS, SEGMENT_LABELS, TRUST_BUCKETS, TRUST_BUCKET_LABELS, type CustomerListItem } from "@/features/customers/schemas";
import { TrustText } from "@/features/customers/components/cod-trust";
import { ExportButton } from "@/features/customers/components/export-button";
import { ProductPicker } from "@/features/customers/components/product-picker";

/**
 * «العملاء» as a work table (US-07.1, FR-07.02): derived customers, server pagination (50),
 * ordering and every filter in the URL; the segment strip shows the live `AUDIENCE_TYPE`
 * count and hands the same segment to M13 («إنشاء حملة لهذه الشريحة»). Enter on a row opens
 * the `?customer=` sheet; `W` opens WhatsApp for the focused row. Phones are Mono LTR; the
 * marketplace-masked ones read «هاتف غير متاح من السوق».
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

const dateInputClass = "h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8";

export function CustomersTable() {
  const router = useRouter();
  const table = useTableUrlState();
  const { filters, setFilters, activeCount, isFiltered, clear } = useCustomerFilters();
  const [, setOpen] = useOpenCustomer();
  const { canPermission } = useAccess();
  const canView = canPermission("customers.view");
  const [now] = useState(() => new Date());

  const filterQuery = {
    q: filters.q || undefined,
    segment: filters.segment === "all" ? undefined : filters.segment,
    product_id: filters.segment === "bought_product" ? filters.product_id || undefined : undefined,
    last_order_from: filters.last_order_from || undefined,
    last_order_to: filters.last_order_to || undefined,
    min_spent: filters.min_spent || undefined,
    trust: filters.trust ?? undefined,
    has_wallet: filters.has_wallet === "true" ? "true" : undefined,
    has_points: filters.has_points === "true" ? "true" : undefined,
  };
  const params = {
    ...filterQuery,
    ordering: table.ordering || undefined,
    page: table.page,
    page_size: table.pageSize,
  };
  const query = useCustomers(params, canView);
  const segment = useSegmentCount(filters.segment, filters.segment === "bought_product" ? filters.product_id : "", canView);
  const data = query.data;

  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
  };

  // `W` → WhatsApp for the focused row (the profile handles it inside the sheet).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "w" || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("[role=dialog]")) return;
      const row = document.activeElement instanceof HTMLElement ? document.activeElement.closest("[data-row]") : null;
      const cell = row?.querySelector<HTMLElement>("[data-phone]");
      if (!cell || cell.dataset.available !== "true") return;
      event.preventDefault();
      window.open(`https://wa.me/${cell.dataset.phone}`, "_blank", "noopener,noreferrer");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const columns = useMemo<ColumnDef<CustomerListItem, unknown>[]>(
    () => [
      {
        id: "name",
        meta: { sortKey: "name" },
        header: headerLabel("العميل"),
        cell: ({ row }) => (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              void setOpen({ customer: row.original.phone });
            }}
            className="flex min-w-32 items-center gap-1.5 text-start hover:underline"
            data-testid="customer-open"
          >
            <span className="truncate">{row.original.name}</span>
            {row.original.cod_disabled ? <span aria-label="الدفع عند الاستلام موقوف" title="الدفع عند الاستلام موقوف" className="size-1.5 shrink-0 rounded-full bg-destructive" /> : null}
          </button>
        ),
      },
      {
        id: "phone",
        header: headerLabel("الهاتف"),
        cell: ({ row }) =>
          row.original.phone_available ? (
            <Mono className="whitespace-nowrap text-xs" data-phone={row.original.phone} data-available="true">
              {prettyPhone(row.original.phone)}
            </Mono>
          ) : (
            <span className="whitespace-nowrap text-xs text-muted-foreground" data-phone={row.original.phone} data-available="false">
              هاتف غير متاح من السوق
            </span>
          ),
      },
      {
        id: "orders_count",
        meta: { numeric: true, sortKey: "orders_count" },
        header: headerLabel("الطلبات"),
        cell: ({ row }) => formatNumber(row.original.orders_count),
      },
      {
        id: "total_spent",
        meta: { numeric: true, sortKey: "total_spent" },
        header: headerLabel("الإنفاق"),
        cell: ({ row }) => <Money value={row.original.display_total_spent} />,
      },
      {
        id: "last_order_at",
        meta: { sortKey: "last_order_at", className: "whitespace-nowrap" },
        header: headerLabel("آخر طلب"),
        cell: ({ row }) => (
          <time dateTime={row.original.last_order_at} title={formatDateTime(row.original.last_order_at)} className="text-xs text-muted-foreground">
            {formatRelative(row.original.last_order_at, now)}
          </time>
        ),
      },
      {
        id: "trust",
        header: headerLabel("ثقة الدفع عند الاستلام"),
        cell: ({ row }) => <TrustText riskPercentage={row.original.trust.platform_risk_percentage} />,
      },
      {
        id: "wallet",
        meta: { numeric: true },
        header: headerLabel("المحفظة"),
        cell: ({ row }) => <Money value={row.original.display_wallet_balance} />,
      },
      {
        id: "points",
        meta: { numeric: true },
        header: headerLabel("النقاط"),
        cell: ({ row }) => (row.original.points_balance === null ? <span className="text-muted-foreground">—</span> : formatNumber(row.original.points_balance)),
      },
    ],
    [now, setOpen],
  );

  const segmentReady = filters.segment !== "bought_product" || Boolean(filters.product_id);
  const campaignHref = `/dashboard/marketing/campaigns/new?segment=${filters.segment}${filters.segment === "bought_product" && filters.product_id ? `&product_id=${filters.product_id}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm" data-testid="segment-bar">
        <p className="text-muted-foreground">
          الشريحة: <span className="text-foreground">{SEGMENT_LABELS[filters.segment]}</span>
          {filters.segment === "bought_product" && segment.data?.product ? <> — {segment.data.product.name}</> : null} ·{" "}
          <Mono className="text-foreground" data-testid="segment-count">
            {segmentReady ? (segment.data ? formatNumber(segment.data.count) : "–") : "اختر منتجاً"}
          </Mono>{" "}
          {segmentReady ? "عميلاً" : null}
        </p>
        <div className="flex flex-wrap items-start gap-2">
          {segmentReady ? (
            <Link href={campaignHref} className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="segment-campaign">
              إنشاء حملة لهذه الشريحة
            </Link>
          ) : null}
          <ExportButton query={filterQuery} count={data?.count} />
        </div>
      </div>

      <DataTable<CustomerListItem>
        testId="customers-table"
        caption="قائمة العملاء"
        columns={columns}
        data={data?.results}
        getRowId={(r) => r.phone}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        forbidden={!canView}
        isFiltered={isFiltered}
        onRowOpen={(row) => void setOpen({ customer: row.phone })}
        toolbar={
          <FilterBar
            activeCount={activeCount}
            onClear={clear}
            search={<SearchBox value={filters.q} onChange={(q) => set({ q: q || null })} placeholder="الهاتف (0770…) أو الاسم" label="بحث في العملاء" />}
          >
            <FilterSelect
              label="الشريحة"
              value={filters.segment === "all" ? "" : filters.segment}
              onChange={(v) => set({ segment: (v || null) as typeof filters.segment | null, product_id: null })}
              options={SEGMENTS.filter((s) => s !== "all").map((s) => ({ value: s, label: SEGMENT_LABELS[s] }))}
              testId="filter-segment"
            />
            {filters.segment === "bought_product" ? (
              <ProductPicker productId={filters.product_id} productName={segment.data?.product?.name ?? null} onChange={(id) => set({ product_id: id })} />
            ) : null}
            <FilterSelect
              label="ثقة COD"
              value={filters.trust ?? ""}
              onChange={(v) => set({ trust: (v || null) as typeof filters.trust })}
              options={TRUST_BUCKETS.map((t) => ({ value: t, label: TRUST_BUCKET_LABELS[t] }))}
              testId="filter-trust"
            />
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">إنفاق ≥</span>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                defaultValue={filters.min_spent}
                key={filters.min_spent}
                onBlur={(e) => set({ min_spent: /^\d+(\.\d{1,2})?$/.test(e.target.value.trim()) ? e.target.value.trim() : null })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="0"
                className="h-11 w-full rounded-lg border border-input bg-card px-2 text-end font-mono text-sm md:h-8 md:w-24"
                aria-label="حد الإنفاق الأدنى"
                data-testid="filter-min-spent"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">آخر طلب من</span>
              <input type="date" dir="ltr" value={filters.last_order_from} max={filters.last_order_to || undefined} onChange={(e) => set({ last_order_from: e.target.value || null })} className={dateInputClass} aria-label="آخر طلب من تاريخ" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">إلى</span>
              <input type="date" dir="ltr" value={filters.last_order_to} min={filters.last_order_from || undefined} onChange={(e) => set({ last_order_to: e.target.value || null })} className={dateInputClass} aria-label="آخر طلب إلى تاريخ" />
            </label>
            <FilterSelect label="محفظة" value={filters.has_wallet} onChange={(v) => set({ has_wallet: v || null })} options={[{ value: "true", label: "له محفظة" }]} testId="filter-wallet" />
            <FilterSelect label="نقاط" value={filters.has_points} onChange={(v) => set({ has_points: v || null })} options={[{ value: "true", label: "له نقاط" }]} testId="filter-points" />
          </FilterBar>
        }
        renderMobileCard={(c) => (
          <button type="button" onClick={() => router.push(`/dashboard/customers/${c.phone}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="customer-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                {c.name}
                {c.cod_disabled ? <span aria-label="الدفع عند الاستلام موقوف" className="size-1.5 shrink-0 rounded-full bg-destructive" /> : null}
              </span>
              {c.phone_available ? <Mono className="text-xs text-muted-foreground">{prettyPhone(c.phone)}</Mono> : <span className="text-xs text-muted-foreground">هاتف غير متاح من السوق</span>}
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                <Mono className="text-foreground">{formatNumber(c.orders_count)}</Mono> طلب
              </span>
              <TrustText riskPercentage={c.trust.platform_risk_percentage} className="text-xs" />
            </span>
          </button>
        )}
        emptyState={<EmptyState title="لا عملاء بعد — يظهر العميل بعد أول طلب" description="كل رقم هاتف يطلب من متجرك يصبح عميلاً هنا بطلباته وثقته ومحفظته." />}
        noResultsState={
          <EmptyState
            title="لا عملاء يطابقون البحث أو الفلاتر"
            description="جرّب رقماً آخر أو شريحة أخرى."
            action={
              <Button variant="outline" size="lg" className="h-11" onClick={clear} data-testid="clear-filters">
                مسح الفلاتر
              </Button>
            }
          />
        }
      />
    </div>
  );
}
