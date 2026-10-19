"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useConfirmShipment, useMarketOrders } from "@/features/marketplaces/api";
import {
  CONFIRM_LABELS,
  FULFILLMENT_LABELS,
  MARKETS,
  MARKET_LABELS,
  MARKET_ORDER_STATUSES,
  MARKET_ORDER_STATUS_LABELS,
  type Market,
  type MarketOrder,
} from "@/features/marketplaces/schemas";
import { MarketplacesGate, MarketplacesNav, StatusText } from "@/features/marketplaces/components/bits";

/**
 * `/dashboard/channels/marketplaces/orders` (US-28.5, FR-28.08): orders pulled from the
 * markets, linking to M06. FBA orders («ينفّذه السوق») carry no fulfilment action; a
 * merchant-fulfilled order shows the market's shipment-confirmation status verbatim, with
 * «إعادة تأكيد» when it failed.
 */
const parsers = {
  market: parseAsStringLiteral(MARKETS),
  fulfillment: parseAsStringLiteral(["marketplace", "merchant"] as const),
  status: parseAsStringLiteral(MARKET_ORDER_STATUSES),
};
const PAGE_SIZE = 20;

export function MarketOrdersScreen() {
  return (
    <MarketplacesGate>
      <OrdersInner />
    </MarketplacesGate>
  );
}

function OrdersInner() {
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [now] = useState(() => new Date());
  const query = useMarketOrders({ market: f.market ?? undefined, fulfillment: f.fulfillment ?? undefined, status: f.status ?? undefined, page: table.page > 1 ? table.page : undefined });
  const confirm = useConfirmShipment();
  const set = (p: Parameters<typeof setF>[0]) => {
    void setF(p);
    table.resetPage();
  };

  const columns = useMemo<ColumnDef<MarketOrder, unknown>[]>(
    () => [
      {
        id: "order",
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <Link href={`/dashboard/orders?order=${row.original.order_id}`} className="hover:underline" data-testid="market-order-link">
            <Mono>{row.original.order_number}</Mono>
          </Link>
        ),
      },
      {
        id: "external",
        header: headerLabel("رقم السوق"),
        cell: ({ row }) => (
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">{MARKET_LABELS[row.original.marketplace]}</span>
            <Mono className="text-xs">{row.original.external_order_id}</Mono>
          </span>
        ),
      },
      {
        id: "fulfillment",
        header: headerLabel("التنفيذ"),
        cell: ({ row }) =>
          row.original.fulfillment === "marketplace" ? (
            <span className="whitespace-nowrap text-sm" title="إجراءات التنفيذ معطّلة — يتولاها السوق" data-testid="fba-tag">
              {FULFILLMENT_LABELS.marketplace}
            </span>
          ) : (
            <span className="whitespace-nowrap text-sm text-muted-foreground">{FULFILLMENT_LABELS.merchant}</span>
          ),
      },
      {
        id: "mstatus",
        header: headerLabel("حالة السوق"),
        cell: ({ row }) => {
          const s = row.original.marketplace_status;
          return (
            <span title={s === "unknown" ? "لم يتعرّف النظام على حالة السوق" : undefined}>
              <StatusText tone={s === "canceled" ? "muted" : s === "unknown" ? "warning" : s === "shipped" ? "success" : "info"} label={MARKET_ORDER_STATUS_LABELS[s]} />
            </span>
          );
        },
      },
      {
        id: "confirm",
        header: headerLabel("تأكيد الشحنة"),
        cell: ({ row }) => {
          const o = row.original;
          const tone = o.shipment_confirm_status === "confirmed" ? "success" : o.shipment_confirm_status === "failed" ? "destructive" : "muted";
          return (
            <span className="flex flex-col gap-1">
              <StatusText tone={tone} label={CONFIRM_LABELS[o.shipment_confirm_status]} testId="confirm-status" value={o.shipment_confirm_status} />
              {o.shipment_confirm_error ? (
                <span className="max-w-56 text-xs text-muted-foreground" dir="ltr">
                  {o.shipment_confirm_error}
                </span>
              ) : null}
              {o.shipment_confirm_status === "failed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 self-start lg:h-7"
                  disabled={confirm.isPending}
                  data-testid="reconfirm"
                  onClick={async () => {
                    try {
                      await confirm.mutateAsync(o.order_id);
                      toast.success(`أُعيد تأكيد شحنة ${o.order_number}`);
                    } catch (e) {
                      toast.error(isApiError(e) ? e.userMessage : "تعذّر التأكيد");
                    }
                  }}
                >
                  إعادة تأكيد
                </Button>
              ) : null}
            </span>
          );
        },
      },
      { id: "total", meta: { numeric: true }, header: headerLabel("الإجمالي"), cell: ({ row }) => <Money value={row.original.display_total} /> },
      { id: "at", header: headerLabel("التاريخ"), cell: ({ row }) => <time dateTime={row.original.created_at} title={formatDateTime(row.original.created_at)} className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.created_at, now)}</time> },
    ],
    [confirm, now],
  );

  const activeCount = [f.market, f.fulfillment, f.status].filter(Boolean).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="طلبات الأسواق" description="الطلبات الواردة من أمازون ونون — تُدار من لوحة الطلبات." />
      <MarketplacesNav active="orders" />
      <DataTable<MarketOrder>
        testId="market-orders-table"
        caption="طلبات الأسواق"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.order_id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={PAGE_SIZE}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(activeCount)}
        emptyState={<EmptyState title="لا طلبات من الأسواق بعد" />}
        renderMobileCard={(o) => (
          <Link href={`/dashboard/orders?order=${o.order_id}`} className="flex flex-col gap-1 p-3 text-sm">
            <span className="flex justify-between">
              <Mono>{o.order_number}</Mono>
              <Money value={o.display_total} />
            </span>
            <span className="text-xs text-muted-foreground">
              {MARKET_LABELS[o.marketplace]} · {FULFILLMENT_LABELS[o.fulfillment]} · {CONFIRM_LABELS[o.shipment_confirm_status]}
            </span>
          </Link>
        )}
        toolbar={
          <FilterBar activeCount={activeCount} onClear={() => set({ market: null, fulfillment: null, status: null })}>
            <FilterSelect label="السوق" value={f.market ?? ""} onChange={(v) => set({ market: (v || null) as Market | null })} options={MARKETS.map((m) => ({ value: m, label: MARKET_LABELS[m] }))} />
            <FilterSelect label="التنفيذ" value={f.fulfillment ?? ""} onChange={(v) => set({ fulfillment: (v || null) as "marketplace" | "merchant" | null })} options={[{ value: "marketplace", label: FULFILLMENT_LABELS.marketplace }, { value: "merchant", label: FULFILLMENT_LABELS.merchant }]} />
            <FilterSelect label="حالة السوق" value={f.status ?? ""} onChange={(v) => set({ status: (v || null) as (typeof MARKET_ORDER_STATUSES)[number] | null })} options={MARKET_ORDER_STATUSES.map((s) => ({ value: s, label: MARKET_ORDER_STATUS_LABELS[s] }))} />
          </FilterBar>
        }
      />
    </div>
  );
}
