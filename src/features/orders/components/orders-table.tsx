"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import {
  BulkActionDialog,
  DataTable,
  FilterBar,
  FilterSelect,
  SearchBox,
  StatStrip,
  headerLabel,
  useTableUrlState,
  type BulkReport,
} from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative, prettyPhone } from "@/lib/format";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { CopyStoreLink } from "@/features/dashboard-shell/components/overview/copy-store-link";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  SALES_CHANNELS,
  SALES_CHANNEL_LABELS,
  TRAFFIC_SOURCES,
  TRAFFIC_SOURCE_LABELS,
  type OrderListItem,
  type OrderStatusDef,
} from "@/features/orders/schemas";
import { ordersApi, useApplyOrder, useOrderCounters, useOrderFormOptions, useOrders, useOrderStatuses } from "@/features/orders/api";
import { useOpenOrder, useOrderFilters } from "@/features/orders/hooks/use-order-filters";
import { useOrderWrite } from "@/features/orders/hooks/use-order-write";
import { ConflictPanel } from "@/features/orders/components/conflict-panel";
import { FulfillmentMenu, menuBlockedReason, targetBlockedReason } from "@/features/orders/components/fulfillment-menu";
import { FinancialStatus, FulfillmentDot, PaymentStatusText } from "@/features/orders/components/order-status";

/**
 * «كل الطلبات» as a work table (M06 US-06.1, T076): the text number strip from `counters`
 * (independent of the filters — said in its tooltip, M06 §8), the two status columns kept
 * apart, every filter in the URL, server pagination/ordering, in-place fulfilment change
 * carrying `version` (409 → conflict panel), bulk change with a preview and a per-order
 * report, and mobile cards. Enter/Space on a row opens the `?order=` side sheet.
 */
export function OrdersTable() {
  const router = useRouter();
  const origin = useStoreOrigin();
  const table = useTableUrlState();
  const { filters, setFilters, activeCount, isFiltered, clear } = useOrderFilters();
  const [, setOpen] = useOpenOrder();
  const { canPermission } = useAccess();
  const canView = canPermission("orders.view");
  const canEdit = canPermission("orders.update_status");
  const statuses = useOrderStatuses().data;
  const counters = useOrderCounters(canView).data;
  const locations = useOrderFormOptions(canView).data?.locations;
  const write = useOrderWrite();
  const apply = useApplyOrder();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState("");
  const [now] = useState(() => new Date());

  const params = {
    q: filters.q || undefined,
    status: filters.status ?? undefined,
    payment_status: filters.payment_status ?? undefined,
    fulfillment_status: filters.fulfillment_status || undefined,
    channel: filters.channel ?? undefined,
    traffic_source: filters.traffic_source ?? undefined,
    location: filters.location || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    ordering: table.ordering || undefined,
    page: table.page,
    page_size: table.pageSize,
  };
  const query = useOrders(params, { enabled: canView });
  const data = query.data;
  const statusList = useMemo(() => statuses ?? [], [statuses]);

  const set = (patch: Parameters<typeof setFilters>[0]) => {
    void setFilters(patch);
    table.resetPage();
    setSelection({});
  };

  const changeFulfillment = useMemo(
    () => (order: OrderListItem, target: OrderStatusDef) =>
      void write.run(order.id, order.version, (v) => ordersApi.setFulfillment(order.id, target.id, v), {
        success: `الطلب #${order.id}: «${target.name}»`,
        label: `حالة التنفيذ → ${target.name}`,
      }),
    [write],
  );

  const columns = useMemo<ColumnDef<OrderListItem, unknown>[]>(
    () => [
      {
        id: "id",
        meta: { sortKey: "id", className: "whitespace-nowrap" },
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <Link href={`/dashboard/orders/${row.original.id}`} tabIndex={-1} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            <Mono>#{row.original.id}</Mono>
          </Link>
        ),
      },
      {
        id: "customer",
        header: headerLabel("العميل"),
        cell: ({ row }) => (
          <span className="flex min-w-36 flex-col leading-tight">
            <span className="truncate">{row.original.customer_name}</span>
            <Mono className="text-[11px] text-muted-foreground">{prettyPhone(row.original.customer_phone)}</Mono>
          </span>
        ),
      },
      {
        id: "total",
        meta: { numeric: true, sortKey: "total" },
        header: headerLabel("الإجمالي"),
        cell: ({ row }) => <Money value={row.original.display_total} />,
      },
      {
        id: "payment",
        header: headerLabel("الدفع"),
        cell: ({ row }) => <PaymentStatusText status={row.original.payment_status} />,
      },
      {
        id: "status",
        header: headerLabel("الحالة المالية"),
        cell: ({ row }) => <FinancialStatus status={row.original.status} />,
      },
      {
        id: "fulfillment",
        header: headerLabel("حالة التنفيذ"),
        cell: ({ row }) => (
          <FulfillmentMenu order={row.original} statuses={statusList} canEdit={canEdit} onSelect={(t) => changeFulfillment(row.original, t)} />
        ),
      },
      {
        id: "channel",
        header: headerLabel("القناة"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {SALES_CHANNEL_LABELS[row.original.sales_channel]}
            {row.original.traffic_source && row.original.traffic_source !== "direct" ? ` · ${TRAFFIC_SOURCE_LABELS[row.original.traffic_source]}` : ""}
          </span>
        ),
      },
      {
        id: "created_at",
        meta: { sortKey: "created_at", className: "whitespace-nowrap" },
        header: headerLabel("التاريخ"),
        cell: ({ row }) => (
          <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="text-xs text-muted-foreground">
            {formatRelative(row.original.created_at, now)}
          </time>
        ),
      },
    ],
    [canEdit, changeFulfillment, now, statusList],
  );

  async function runBulk(ids: string[]): Promise<BulkReport> {
    const target = statusList.find((s) => s.id === Number(bulkTarget));
    if (!target) return { succeeded: 0, failed: [] };
    const rows = new Map((data?.results ?? []).map((r) => [String(r.id), r]));
    let succeeded = 0;
    const failed: BulkReport["failed"] = [];
    // One versioned request per order (no bulk endpoint upstream); blocked rows are reported, not sent.
    for (const id of ids) {
      const row = rows.get(id);
      if (!row) continue;
      const blocked = menuBlockedReason(row, canEdit) ?? targetBlockedReason(row, target);
      if (blocked) {
        failed.push({ id, reason: blocked === "الحالة الحالية" ? "على هذه الحالة أصلاً" : blocked });
        continue;
      }
      try {
        apply(await ordersApi.setFulfillment(row.id, target.id, row.version));
        succeeded++;
      } catch (err) {
        failed.push({ id, reason: isApiError(err) ? (err.status === 409 ? "حُدِّث من مستخدم آخر" : err.userMessage) : "تعذّر الاتصال" });
      }
    }
    setSelection({});
    return { succeeded, failed };
  }

  const fulfillmentOptions = [{ value: "none", label: "بلا حالة" }, ...statusList.map((s) => ({ value: String(s.id), label: s.name }))];

  return (
    <div className="flex flex-col gap-4">
      <div title="العدّادات لكل الطلبات، مستقلة عن الفلاتر">
        <StatStrip
          label="ملخص الطلبات"
          items={[
            {
              key: "new",
              label: "جديد",
              count: counters?.new,
              tone: "warning",
              active: filters.status === "new",
              onSelect: () => set({ status: filters.status === "new" ? null : "new", fulfillment_status: null }),
            },
            {
              key: "awaiting",
              label: "بانتظار تأكيد الدفع",
              count: counters?.awaiting_payment,
              active: filters.status === "awaiting_payment",
              onSelect: () => set({ status: filters.status === "awaiting_payment" ? null : "awaiting_payment", fulfillment_status: null }),
            },
            {
              key: "review",
              label: "يتطلب مراجعة دفع",
              count: counters?.payment_review,
              tone: "destructive",
              active: filters.status === "payment_review",
              onSelect: () => set({ status: filters.status === "payment_review" ? null : "payment_review", fulfillment_status: null }),
            },
            ...(counters?.by_fulfillment ?? [])
              .filter((f) => f.count > 0)
              .map((f) => ({
                key: `f${f.id}`,
                label: f.name,
                count: f.count,
                active: filters.fulfillment_status === String(f.id),
                onSelect: () => set({ fulfillment_status: filters.fulfillment_status === String(f.id) ? null : String(f.id), status: null }),
              })),
          ]}
        />
      </div>

      <ConflictPanel conflict={write.conflict} onRetry={() => void write.retryConflict()} onDismiss={write.dismissConflict} pending={write.pending} />

      <DataTable<OrderListItem>
        testId="orders-table"
        caption="قائمة الطلبات"
        columns={columns}
        data={data?.results}
        getRowId={(r) => String(r.id)}
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
        selectable={canEdit}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        onRowOpen={(row) => void setOpen({ order: row.id })}
        toolbar={
          <FilterBar
            activeCount={activeCount}
            onClear={clear}
            search={<SearchBox value={filters.q} onChange={(q) => set({ q: q || null })} placeholder="رقم الطلب أو الهاتف أو الاسم" label="بحث في الطلبات" />}
          >
            <FilterSelect
              label="المالية"
              value={filters.status ?? ""}
              onChange={(v) => set({ status: (v || null) as typeof filters.status })}
              options={ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))}
              testId="filter-status"
            />
            <FilterSelect
              label="الدفع"
              value={filters.payment_status ?? ""}
              onChange={(v) => set({ payment_status: (v || null) as typeof filters.payment_status })}
              options={PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] }))}
              testId="filter-payment"
            />
            <FilterSelect
              label="التنفيذ"
              value={filters.fulfillment_status}
              onChange={(v) => set({ fulfillment_status: v || null })}
              options={fulfillmentOptions}
              testId="filter-fulfillment"
            />
            <FilterSelect
              label="القناة"
              value={filters.channel ?? ""}
              onChange={(v) => set({ channel: (v || null) as typeof filters.channel })}
              options={SALES_CHANNELS.map((s) => ({ value: s, label: SALES_CHANNEL_LABELS[s] }))}
            />
            <FilterSelect
              label="المصدر"
              value={filters.traffic_source ?? ""}
              onChange={(v) => set({ traffic_source: (v || null) as typeof filters.traffic_source })}
              options={TRAFFIC_SOURCES.map((s) => ({ value: s, label: TRAFFIC_SOURCE_LABELS[s] }))}
            />
            <FilterSelect
              label="الموقع"
              value={filters.location}
              onChange={(v) => set({ location: v || null })}
              options={(locations ?? []).map((l) => ({ value: String(l.id), label: l.name }))}
            />
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">من</span>
              <input type="date" dir="ltr" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value || null })} className="h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8" aria-label="من تاريخ" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5">
              <span className="text-xs text-muted-foreground md:whitespace-nowrap">إلى</span>
              <input type="date" dir="ltr" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value || null })} className="h-11 rounded-lg border border-input bg-card px-2 font-mono text-sm md:h-8" aria-label="إلى تاريخ" />
            </label>
          </FilterBar>
        }
        bulkActions={() => (
          <Button variant="outline" size="sm" className="h-11 lg:h-7" onClick={() => setBulkOpen(true)} data-testid="bulk-fulfillment">
            تغيير حالة التنفيذ
          </Button>
        )}
        renderMobileCard={(o) => (
          <button type="button" onClick={() => router.push(`/dashboard/orders/${o.id}`)} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="order-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline gap-2">
                <Mono className="text-sm font-medium">#{o.id}</Mono>
                <span className="truncate text-sm">{o.customer_name}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <FinancialStatus status={o.status} />
                <FulfillmentDot status={o.fulfillment_status} className="text-muted-foreground" />
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Money value={o.display_total} className="text-sm" />
              <time dateTime={o.created_at} className="text-[11px] text-muted-foreground">
                {formatRelative(o.created_at, now)}
              </time>
            </span>
          </button>
        )}
        emptyState={
          <EmptyState
            title="لا طلبات بعد — شارك رابط متجرك"
            description="أول طلب يصل يظهر هنا فوراً، ويزيد عدّاد «الطلبات» في الشريط الجانبي."
            action={<CopyStoreLink storeUrl={origin} />}
          />
        }
        noResultsState={
          <EmptyState
            title="لا طلبات تطابق الفلاتر"
            description="العدّادات أعلاه لكل الطلبات بغضّ النظر عن الفلاتر."
            action={
              <Button variant="outline" size="lg" className="h-11" onClick={clear} data-testid="clear-filters">
                مسح الفلاتر
              </Button>
            }
          />
        }
      />

      <BulkActionDialog
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) setBulkTarget("");
        }}
        title="تغيير حالة التنفيذ — طلبات محددة"
        count={Object.values(selection).filter(Boolean).length}
        confirmLabel="تطبيق"
        description="تُطبَّق على المسموح منها فقط؛ المكتملة والمستردة وطلبات الأسواق تُرفض بسببها."
        confirmDisabled={!bulkTarget}
        run={() => runBulk(Object.keys(selection).filter((k) => selection[k]))}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          الحالة الجديدة
          <NativeSelect value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className="h-11 lg:h-8" data-testid="bulk-target">
            <option value="">اختر حالة</option>
            {statusList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </label>
      </BulkActionDialog>
    </div>
  );
}
