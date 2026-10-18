"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { DataTable, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useEdgeCases, useShipmentActions } from "@/features/shipping/api";
import { EDGE_KINDS, EDGE_KIND_LABELS, EVENT_SOURCE_LABELS, SHIPMENT_STATUS_LABELS, type EdgeKind, type EdgeRow, type ShipmentStatus } from "@/features/shipping/schemas";
import { ShippingSubnav, ghostButton, outlineButton, primaryButton } from "@/features/shipping/components/bits";

/**
 * `/dashboard/shipping/edge-cases?kind=` (US-15.7): the four queues as ONE clickable text
 * number strip (the tabs carry the counts in Mono — §11 I: no KPI cards), polled every
 * 60 s (SC-15.5). Each row opens the order (M39's shipment page comes later). Two
 * actions under `orders.update_status`, gated by the `ShipmentOrder` state machine
 * (FR-15.05) with the server's reason on every disabled button.
 */
export function EdgeCasesScreen() {
  return (
    <AccessGate permission="orders.view">
      <EdgeCasesBody />
    </AccessGate>
  );
}

const TERMINAL: ShipmentStatus[] = ["delivered", "returned", "cancelled", "compensated_lost"];

export function ShipmentStatusText({ status }: { status: ShipmentStatus }) {
  const dot = status === "in_transit" || status === "picked_up" ? "bg-info" : status === "delivered" ? "bg-success" : TERMINAL.includes(status) ? "bg-muted-foreground" : "bg-warning";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {SHIPMENT_STATUS_LABELS[status]}
    </span>
  );
}

function EdgeCasesBody() {
  const { canPermission } = useAccess();
  const canAct = canPermission("orders.update_status");
  const [kind, setKind] = useQueryState("kind", parseAsStringLiteral(EDGE_KINDS).withDefault("out_of_order").withOptions({ history: "replace" }));
  const table = useTableUrlState();
  const query = useEdgeCases(kind, { page: table.page, page_size: table.pageSize });
  const [dialog, setDialog] = useState<{ kind: "address" | "convert"; row: EdgeRow } | null>(null);
  const data = query.data;

  const columns = useMemo<ColumnDef<EdgeRow, unknown>[]>(
    () => [
      {
        id: "waybill",
        header: headerLabel("البوليصة"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <span className="flex flex-col">
            <Mono>{row.original.waybill}</Mono>
            <span className="text-xs text-muted-foreground">{row.original.carrier}</span>
          </span>
        ),
      },
      {
        id: "order",
        header: headerLabel("الطلب"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <span className="flex flex-col">
            <Link href={`/dashboard/orders?order=${row.original.order_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()} data-testid="edge-order-link">
              <Mono>#{row.original.order_id}</Mono>
            </Link>
            <span className="text-xs text-muted-foreground">{row.original.customer_name}</span>
          </span>
        ),
      },
      { id: "status", header: headerLabel("حالة الشحنة"), cell: ({ row }) => <ShipmentStatusText status={row.original.status} /> },
      {
        id: "event",
        header: headerLabel(kind === "sla_breach" ? "المهلة" : "الحدث"),
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span>{row.original.event_label ?? "تجاوزت مهلة التسليم"}</span>
            <span className="text-xs text-muted-foreground">{row.original.note}</span>
          </span>
        ),
      },
      { id: "source", header: headerLabel("المصدر"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.source ? EVENT_SOURCE_LABELS[row.original.source] : "—"}</span> },
      { id: "at", header: headerLabel("الوقت"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <Mono className="text-xs text-muted-foreground">{formatDateTime(row.original.occurred_at)}</Mono> },
      {
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-px whitespace-nowrap" },
        header: headerLabel("إجراءات"),
        cell: ({ row }) => <EdgeActions row={row.original} canAct={canAct} onOpen={(k) => setDialog({ kind: k, row: row.original })} />,
      },
    ],
    [kind, canAct],
  );

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="edge-cases-screen">
      <PageHeader
        title="الحالات الحدّية"
        description="أحداث تتبع تحتاج نظرة بشرية، وشحنات تجاوزت مهلتها. تتحدث القائمة كل دقيقة."
        actions={
          <button type="button" className={outlineButton} onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="edge-refresh">
            <RefreshCw className={cn("size-4", query.isFetching && "motion-safe:animate-spin")} aria-hidden /> تحديث
          </button>
        }
      />
      <ShippingSubnav />
      <Tabs
        value={kind}
        onValueChange={(v) => {
          void setKind(v as EdgeKind);
          table.resetPage();
        }}
      >
        <TabsList variant="line" className="h-auto min-h-11 flex-wrap justify-start border-b border-border lg:min-h-9" aria-label="نوع الحالة" data-testid="edge-strip">
          {EDGE_KINDS.map((k) => {
            const n = data?.counts[k];
            return (
              <TabsTrigger key={k} value={k} className="min-h-11 flex-none gap-1.5 px-3 lg:min-h-8" data-testid={`edge-tab-${k}`}>
                {EDGE_KIND_LABELS[k]}
                <Mono className={cn("text-xs", (n ?? 0) > 0 ? (k === "rejected" || k === "sla_breach" ? "text-destructive" : "text-warning") : "text-muted-foreground")} data-testid={`edge-count-${k}`}>
                  {n ?? "–"}
                </Mono>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <DataTable<EdgeRow>
        testId="edge-table"
        caption={EDGE_KIND_LABELS[kind]}
        columns={columns}
        data={data?.results}
        getRowId={(r) => r.id}
        total={data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyState={<EmptyState title={kind === "sla_breach" ? "لا شحنات متجاوزة للمهلة" : `لا أحداث ${EDGE_KIND_LABELS[kind]}`} description="كل ما يصل من الناقلين وتطبيق المندوب يُطابَق تلقائياً؛ يظهر هنا ما يحتاج مراجعة فقط." />}
        renderMobileCard={(r) => (
          <div className="flex flex-col gap-1.5 p-3" data-testid="edge-card">
            <span className="flex items-center justify-between gap-2">
              <Mono className="text-sm">{r.waybill}</Mono>
              <ShipmentStatusText status={r.status} />
            </span>
            <span className="text-sm">{r.event_label ?? "تجاوزت مهلة التسليم"}</span>
            <span className="text-xs text-muted-foreground">{r.note}</span>
            <span className="flex items-center justify-between gap-2">
              <Link href={`/dashboard/orders?order=${r.order_id}`} className="inline-flex min-h-11 items-center text-sm">
                الطلب <Mono className="ms-1">#{r.order_id}</Mono>
              </Link>
              <EdgeActions row={r} canAct={canAct} onOpen={(k) => setDialog({ kind: k, row: r })} />
            </span>
          </div>
        )}
      />

      <AddressDialog row={dialog?.kind === "address" ? dialog.row : null} onClose={() => setDialog(null)} />
      <ConvertToPickupDialog row={dialog?.kind === "convert" ? dialog.row : null} pickupOptions={data?.pickup_options ?? []} onClose={() => setDialog(null)} onRefresh={() => query.refetch()} />
    </div>
  );
}

function EdgeActions({ row, canAct, onOpen }: { row: EdgeRow; canAct: boolean; onOpen: (k: "address" | "convert") => void }) {
  const noPerm = canAct ? null : "تحتاج صلاحية تحديث حالة الطلب";
  const addressBlock = noPerm ?? row.address_block_reason;
  const convertBlock = noPerm ?? row.convert_block_reason;
  return (
    <span className="flex flex-wrap justify-end gap-1 md:flex-nowrap" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={ghostButton} disabled={Boolean(addressBlock)} title={addressBlock ?? undefined} onClick={() => onOpen("address")} data-testid="edge-address">
        تحديث العنوان
      </button>
      <button type="button" className={ghostButton} disabled={Boolean(convertBlock)} title={convertBlock ?? undefined} onClick={() => onOpen("convert")} data-testid="edge-convert">
        تحويل إلى استلام
      </button>
    </span>
  );
}

/** «تحديث العنوان» — only while `in_transit`; the server records a `merchant_manual` event. */
export function AddressDialog({ row, onClose }: { row: EdgeRow | null; onClose: () => void }) {
  const { updateAddress } = useShipmentActions();
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forId, setForId] = useState<number | null>(null);
  if ((row?.shipment_id ?? null) !== forId) {
    setForId(row?.shipment_id ?? null);
    setAddress("");
    setLat("");
    setLng("");
    setErrors({});
  }

  const submit = () => {
    if (!row) return;
    setErrors({});
    updateAddress.mutate(
      { shipmentId: row.shipment_id, body: { address, latitude: lat || undefined, longitude: lng || undefined } },
      {
        onSuccess: (r) => {
          toast.success(`حُدِّث العنوان — سُجِّل حدث «يدوي من التاجر» على ${row.waybill}.`, { description: r.event.label });
          onClose();
        },
        onError: (e) => {
          if (isApiError(e) && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""])));
          else setErrors({ detail: isApiError(e) ? e.userMessage : "تعذّر التحديث." });
        },
      },
    );
  };

  return (
    <Dialog open={row !== null} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-md" data-testid="address-dialog">
        <DialogTitle>تحديث العنوان أثناء النقل</DialogTitle>
        <DialogDescription>يصل العنوان الجديد إلى المندوب فوراً، ويُسجَّل في سجل الشحنة كتعديل يدوي.</DialogDescription>
        {row ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-xs text-muted-foreground">العنوان الحالي</p>
              <p data-testid="current-address">{row.address}</p>
            </div>
            <Field label="العنوان الجديد" htmlFor="new-address" required error={errors.address}>
              <Textarea id="new-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={Boolean(errors.address)} data-testid="new-address" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="خط العرض" htmlFor="new-lat" error={errors.latitude}>
                <input id="new-lat" dir="ltr" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className={numericInputClass} />
              </Field>
              <Field label="خط الطول" htmlFor="new-lng">
                <input id="new-lng" dir="ltr" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className={numericInputClass} />
              </Field>
            </div>
            {errors.detail ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.detail}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <button type="button" className={outlineButton} onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className={primaryButton} disabled={updateAddress.isPending || address.trim().length === 0} onClick={submit} data-testid="address-submit">
            تأكيد العنوان الجديد
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** «تحويل إلى استلام» — only before `picked_up`; carries `version` → a stale one answers 409 (readable panel, no auto-retry). */
export function ConvertToPickupDialog({ row, pickupOptions, onClose, onRefresh }: { row: EdgeRow | null; pickupOptions: Array<{ id: number; name: string }>; onClose: () => void; onRefresh: () => Promise<unknown> }) {
  const { convertToPickup } = useShipmentActions();
  const [pickup, setPickup] = useState("");
  const [version, setVersion] = useState(0);
  const [conflict, setConflict] = useState<{ current_version: number; status: ShipmentStatus | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forId, setForId] = useState<number | null>(null);
  if ((row?.shipment_id ?? null) !== forId) {
    setForId(row?.shipment_id ?? null);
    setPickup("");
    setVersion(row?.version ?? 0);
    setConflict(null);
    setError(null);
  }

  const submit = () => {
    if (!row) return;
    setError(null);
    convertToPickup.mutate(
      { orderId: row.order_id, body: { pickup_location_id: Number(pickup), version } },
      {
        onSuccess: (r) => {
          toast.success(`حُوِّل الطلب #${r.order_id} إلى استلام من «${r.pickup_location.name}».`);
          onClose();
        },
        onError: (e) => {
          if (isApiError(e) && e.status === 409) {
            const body = (e.body ?? {}) as { current_version?: number; status?: ShipmentStatus };
            setConflict({ current_version: body.current_version ?? version, status: body.status ?? null });
          } else setError(isApiError(e) ? e.userMessage : "تعذّر التحويل.");
        },
      },
    );
  };

  const blockedNow = conflict?.status && !["label_pending", "pending_pickup"].includes(conflict.status);
  return (
    <Dialog open={row !== null} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-md" data-testid="convert-dialog">
        <DialogTitle>تحويل الطلب {row ? <Mono>#{row.order_id}</Mono> : null} إلى استلام</DialogTitle>
        <DialogDescription>تُلغى البوليصة ويستلم العميل طلبه بنفسه. متاح فقط قبل أن يستلم المندوب الشحنة.</DialogDescription>
        {conflict ? (
          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-warning/60 p-3 text-sm" data-testid="convert-conflict">
            <p className="font-medium">حُدِّثت الشحنة من مستخدم آخر</p>
            <p className="text-muted-foreground">
              {blockedNow && conflict.status ? `حالتها الآن «${SHIPMENT_STATUS_LABELS[conflict.status]}» — لم يعد التحويل ممكناً.` : "لم يُنفَّذ التحويل. حدّث البيانات ثم أكّد من جديد."}
            </p>
            {!blockedNow ? (
              <button
                type="button"
                className={`${outlineButton} self-start`}
                onClick={() =>
                  void onRefresh().then(() => {
                    setVersion(conflict.current_version);
                    setConflict(null);
                  })
                }
                data-testid="convert-refresh"
              >
                <RefreshCw className="size-3.5" aria-hidden /> تحديث البيانات
              </button>
            ) : null}
          </div>
        ) : null}
        <Field label="نقطة الاستلام" htmlFor="convert-pickup" required hint={pickupOptions.length === 0 ? "لا نقاط استلام نشطة — أضف واحدة من «نقاط الاستلام»." : undefined}>
          <NativeSelect id="convert-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} className="h-11 md:h-8" data-testid="convert-pickup">
            <option value="">اختر نقطة نشطة</option>
            {pickupOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <p className="text-xs text-muted-foreground">
          نسخة الشحنة <Mono>{version}</Mono>
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <button type="button" className={outlineButton} onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className={primaryButton} disabled={!pickup || convertToPickup.isPending || Boolean(conflict)} onClick={submit} data-testid="convert-submit">
            تأكيد التحويل
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
