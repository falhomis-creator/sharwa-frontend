"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { AccessGate, FeatureOffState } from "@/components/shared/access-gate";
import { DataTable, FilterBar, FilterSelect, SearchBox, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { FormSheet, ShippingSubnav, outlineButton, primaryButton } from "@/features/shipping/components/bits";
import { ShipmentStatusText } from "@/features/shipping/components/edge-cases-screen";
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_LABELS } from "@/features/shipping/schemas";
import { useActiveZones, useIssueWaybill, usePendingOrders, useShipments } from "@/features/shipping/sharwa-ship/api";
import { BillingText, SharwaShipNav, WeightPreview } from "@/features/shipping/sharwa-ship/components/shared";
import { BILLING_LABELS, BILLING_STATUSES, CARRIER_CODES_ALL, CARRIER_LABELS, type PendingOrder, type ShipmentRow } from "@/features/shipping/sharwa-ship/schemas";

/**
 * `/dashboard/shipping/sharwa-ship?tab=pending|waybills` (M39 US-39.1, US-39.2). Two tabs:
 * orders waiting for a waybill (weight preview + issue in a sheet: `{zone_code}` only —
 * cost and weight are server snapshots, FR-39.02) and the waybill table, where the
 * shipment status and the billing status are ALWAYS two columns (FR-39.04). Every filter
 * lives in the URL (FR-39.08).
 */
const TABS = ["pending", "waybills"] as const;

export function SharwaShipScreen() {
  const { canFeature } = useAccess();
  if (!canFeature("sharwa_ship")) return <FeatureOffState title="الميزة غير مفعَّلة لمتجرك" description="فعّل «شروة شيب» من باقتك لإصدار البوليصات." />;
  return (
    <AccessGate permission="orders.view">
      <Body />
    </AccessGate>
  );
}

function Body() {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("pending").withOptions({ history: "replace" }));
  const pending = usePendingOrders();
  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="sharwa-ship-screen">
      <PageHeader title="شروة شيب" description="أصدر بوليصة لكل طلب بمعاينة الوزن وتكلفة المنطقة، وتابع كل بوليصة بمحورَين: أين الشحنة؟ وهل حُصِّلت تكلفتها؟" />
      <ShippingSubnav />
      <SharwaShipNav />
      <Tabs value={tab} onValueChange={(v) => void setTab(v as (typeof TABS)[number])}>
        <TabsList variant="line" className="h-auto min-h-11 justify-start border-b border-border lg:min-h-9" aria-label="القسم">
          <TabsTrigger value="pending" className="min-h-11 flex-none gap-1.5 px-3 lg:min-h-8" data-testid="tab-pending">
            بانتظار الإصدار <Mono className="text-xs text-muted-foreground">{pending.data?.count ?? "–"}</Mono>
          </TabsTrigger>
          <TabsTrigger value="waybills" className="min-h-11 flex-none px-3 lg:min-h-8" data-testid="tab-waybills">
            البوليصات
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "pending" ? <PendingTab query={pending} /> : <WaybillsTab />}
    </div>
  );
}

function PendingTab({ query }: { query: ReturnType<typeof usePendingOrders> }) {
  const { session } = useAccess();
  const owner = session.kind === "merchant";
  const [issuing, setIssuing] = useState<PendingOrder | null>(null);
  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const rows = query.data?.results ?? [];
  if (!rows.length) return <EmptyState title="لا طلبات بانتظار بوليصة" description="كل الطلبات المفتوحة لها بوليصة." />;
  return (
    <>
      <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden" data-testid="pending-orders">
        {rows.map((o) => (
          <li key={o.order_id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-6" data-testid="pending-order">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <Mono>#{o.order_id}</Mono>
                <span className="truncate font-medium">{o.customer_name}</span>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                <bdi>{o.address}</bdi>
              </span>
            </div>
            <WeightPreview w={o.weight_preview} />
            <span className="text-xs text-muted-foreground md:w-28">
              {o.awb_plan_count > 1 ? (
                <>
                  خطة التقسيم: <Mono className="text-foreground">{o.awb_plan_count}</Mono> بوليصات
                </>
              ) : (
                "بوليصة واحدة"
              )}
            </span>
            <button type="button" className={primaryButton} disabled={!owner} title={owner ? undefined : "الإصدار لمالك المتجر"} onClick={() => setIssuing(o)} data-testid="issue-open">
              إصدار بوليصة
            </button>
          </li>
        ))}
      </ul>
      <IssueSheet order={issuing} onClose={() => setIssuing(null)} />
    </>
  );
}

function IssueSheet({ order, onClose }: { order: PendingOrder | null; onClose: () => void }) {
  const zones = useActiveZones(order !== null);
  const issue = useIssueWaybill();
  const router = useRouter();
  const [zone, setZone] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ text: string; split: number | null } | null>(null);

  const close = () => {
    setZone("");
    setFieldError(null);
    setDetail(null);
    onClose();
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setDetail(null);
    if (!zone) {
      setFieldError("يرجى تحديد منطقة الشحن.");
      return;
    }
    setFieldError(null);
    try {
      const s = await issue.mutateAsync({ orderId: order.order_id, zone_code: zone });
      toast.success(`صدرت البوليصة ${s.waybill_number}.`);
      close();
      router.push(`/dashboard/shipping/sharwa-ship/${s.id}`);
    } catch (err) {
      if (isApiError(err)) {
        if (err.fields?.zone_code?.[0]) setFieldError(err.fields.zone_code[0]);
        else {
          const body = err.body as { split_plan?: { awb_count?: number } } | undefined;
          setDetail({ text: err.userMessage, split: body?.split_plan?.awb_count ?? null });
        }
      } else setDetail({ text: "تعذّر الإصدار.", split: null });
    }
  }

  return (
    <FormSheet open={order !== null} onOpenChange={(o) => (o ? null : close())} title={order ? `إصدار بوليصة للطلب #${order.order_id}` : ""} description="اختر المنطقة فقط — التكلفة والوزن لقطات يحسبها الخادم." testId="issue-sheet">
      {order ? (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="rounded-md border border-border p-3">
            <WeightPreview w={order.weight_preview} />
          </div>
          <fieldset className="flex flex-col gap-1.5" aria-describedby={fieldError ? "zone-error" : undefined}>
            <legend className="pb-1.5 text-sm font-medium">منطقة الشحن</legend>
            {zones.isLoading ? <Skeleton className="h-24" /> : null}
            {zones.data?.map((z) => (
              <label key={z.code} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 lg:min-h-9", zone === z.code && "border-primary")}>
                <input type="radio" name="zone_code" value={z.code} checked={zone === z.code} onChange={() => setZone(z.code)} className="size-4 accent-foreground" data-testid={`zone-${z.code}`} />
                <span className="flex-1">{z.name}</span>
                <Mono className="text-xs text-muted-foreground">{z.code}</Mono>
                <Mono className="text-sm">{z.display_price}</Mono>
              </label>
            ))}
            {fieldError ? (
              <p id="zone-error" className="text-sm text-destructive" data-testid="zone-error">
                {fieldError}
              </p>
            ) : null}
          </fieldset>
          {detail ? (
            <div role="alert" className="flex flex-col gap-1 rounded-md border border-destructive/40 p-3 text-sm" data-testid="issue-error">
              <p className="text-destructive">{detail.text}</p>
              {detail.split ? (
                <p className="text-muted-foreground">
                  اقتراح: قسّم الشحنة إلى <Mono className="text-foreground">{detail.split}</Mono> بوليصات من شاشة الطلب.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={outlineButton} onClick={close}>
              إلغاء
            </button>
            <button type="submit" className={primaryButton} disabled={issue.isPending} data-testid="issue-submit">
              إصدار
            </button>
          </div>
        </form>
      ) : null}
    </FormSheet>
  );
}

const filterParsers = {
  status: parseAsString.withDefault(""),
  billing: parseAsString.withDefault(""),
  carrier: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
};

function WaybillsTab() {
  const [f, setF] = useQueryStates(filterParsers, { history: "replace" });
  const table = useTableUrlState();
  const router = useRouter();
  const params = { status: f.status || undefined, billing_status: f.billing || undefined, carrier: f.carrier || undefined, q: f.q || undefined, page: table.page, page_size: table.pageSize };
  const query = useShipments(params);
  const counts = query.data?.counts;
  const set = (patch: Partial<typeof f>) => {
    void setF(patch);
    table.resetPage();
  };
  const active = [f.status, f.billing, f.carrier, f.q].filter(Boolean).length;

  const columns = useMemo<ColumnDef<ShipmentRow, unknown>[]>(
    () => [
      {
        id: "waybill",
        header: headerLabel("البوليصة"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <span className="flex flex-col">
            <Link href={`/dashboard/shipping/sharwa-ship/${row.original.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()} data-testid="waybill-link">
              <Mono>{row.original.waybill_number}</Mono>
            </Link>
            {row.original.children_count ? <span className="text-xs text-muted-foreground">رئيسة · <Mono>{row.original.children_count}</Mono> فرعية</span> : null}
            {row.original.flagged_for_review ? <span className="text-xs text-warning">قيد المراجعة</span> : null}
          </span>
        ),
      },
      {
        id: "order",
        header: headerLabel("الطلب"),
        cell: ({ row }) => (
          <span className="flex flex-col">
            <Mono>#{row.original.order_id}</Mono>
            <span className="text-xs text-muted-foreground">{row.original.customer_name}</span>
          </span>
        ),
      },
      { id: "carrier", header: headerLabel("الناقل"), cell: ({ row }) => <span className="whitespace-nowrap text-sm">{CARRIER_LABELS[row.original.carrier_code]}</span> },
      { id: "zone", header: headerLabel("المنطقة"), cell: ({ row }) => <span className="text-sm">{row.original.zone_name_snapshot}</span> },
      { id: "cost", header: headerLabel("التكلفة"), meta: { className: "text-end whitespace-nowrap" }, cell: ({ row }) => <Mono>{row.original.display_cost}</Mono> },
      { id: "weight", header: headerLabel("الوزن كغ"), meta: { className: "text-end" }, cell: ({ row }) => <Mono>{row.original.actual_weight_snapshot}</Mono> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <ShipmentStatusText status={row.original.status} /> },
      { id: "billing", header: headerLabel("التحصيل"), cell: ({ row }) => <BillingText status={row.original.billing_status} /> },
      { id: "date", header: headerLabel("التاريخ"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</Mono> },
    ],
    [],
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <StatStrip
        label="الحالات"
        items={(["pending_pickup", "in_transit", "delivered"] as const).map((k) => ({ key: k, label: SHIPMENT_STATUS_LABELS[k], count: counts?.[k], active: f.status === k, onSelect: () => set({ status: f.status === k ? "" : k }) }))}
      />
      <DataTable
        caption="البوليصات"
        testId="waybills-table"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={active > 0}
        onRowOpen={(r) => router.push(`/dashboard/shipping/sharwa-ship/${r.id}`)}
        emptyState={<EmptyState title="لا بوليصات بعد" description="أصدر أول بوليصة من تبويب «بانتظار الإصدار»." />}
        noResultsState={<EmptyState title="لا نتائج لهذه الفلاتر" />}
        toolbar={
          <FilterBar activeCount={active} onClear={() => set({ status: "", billing: "", carrier: "", q: "" })} search={<SearchBox value={f.q} onChange={(q) => set({ q })} placeholder="رقم البوليصة أو العميل أو الطلب" />}>
            <FilterSelect label="الحالة" value={f.status} onChange={(v) => set({ status: v })} options={SHIPMENT_STATUSES.map((s) => ({ value: s, label: SHIPMENT_STATUS_LABELS[s] }))} testId="filter-status" />
            <FilterSelect label="التحصيل" value={f.billing} onChange={(v) => set({ billing: v })} options={BILLING_STATUSES.map((s) => ({ value: s, label: BILLING_LABELS[s] }))} testId="filter-billing" />
            <FilterSelect label="الناقل" value={f.carrier} onChange={(v) => set({ carrier: v })} options={CARRIER_CODES_ALL.map((c) => ({ value: c, label: CARRIER_LABELS[c] }))} />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <Link href={`/dashboard/shipping/sharwa-ship/${r.id}`} className="flex flex-col gap-1.5 p-3" data-testid="waybill-card">
            <span className="flex items-center justify-between gap-2">
              <Mono>{r.waybill_number}</Mono>
              <Mono className="text-xs text-muted-foreground">{r.display_cost}</Mono>
            </span>
            <span className="text-sm">{r.customer_name}</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <ShipmentStatusText status={r.status} />
              <BillingText status={r.billing_status} />
            </span>
          </Link>
        )}
      />
    </div>
  );
}
