"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { AccessGate, FeatureOffState } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { outlineButton, primaryButton } from "@/features/shipping/components/bits";
import { ShipmentStatusText } from "@/features/shipping/components/edge-cases-screen";
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_LABELS, type ShipmentStatus } from "@/features/shipping/schemas";
import { useManualStatus, useShipment } from "@/features/shipping/sharwa-ship/api";
import { BillingText, SharwaShipNav } from "@/features/shipping/sharwa-ship/components/shared";
import { CARRIER_LABELS, REJECTION_LABELS, SOURCE_LABELS, type ShipmentDetail, type ShipmentEvent } from "@/features/shipping/sharwa-ship/schemas";

/**
 * `/dashboard/shipping/sharwa-ship/[id]` (US-39.3, FR-39.05/06/07): details, the FULL
 * event timeline (rejected events included — it is an audit log), manual status edit
 * limited by the state machine, and print through M06's waybill layout. `P` prints,
 * `E` jumps to the status edit.
 */
export function ShipmentDetailScreen({ id }: { id: number }) {
  const { canFeature } = useAccess();
  if (!canFeature("sharwa_ship")) return <FeatureOffState title="الميزة غير مفعَّلة لمتجرك" />;
  return (
    <AccessGate permission="orders.view">
      <Body id={id} />
    </AccessGate>
  );
}

function Body({ id }: { id: number }) {
  const query = useShipment(id);
  const editRef = useRef<HTMLDivElement>(null);
  const s = query.data;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      if (e.key.toLowerCase() === "p" && s) window.open(`/dashboard/orders/${s.order_id}/print`, "_blank");
      if (e.key.toLowerCase() === "e") editRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.error || !s) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="shipment-detail">
      <PageHeader
        eyebrow={`#${s.id}`}
        title={s.waybill_number}
        description={`${CARRIER_LABELS[s.carrier_code]} · الطلب #${s.order_id} · ${s.customer_name}`}
        actions={
          <>
            <Link href="/dashboard/shipping/sharwa-ship?tab=waybills" className={outlineButton}>
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> البوليصات
            </Link>
            <a href={`/dashboard/orders/${s.order_id}/print`} target="_blank" rel="noreferrer" className={outlineButton} data-testid="print-waybill">
              <Printer className="size-4" aria-hidden /> طباعة <kbd className="hidden font-mono text-[11px] text-muted-foreground lg:inline">P</kbd>
            </a>
          </>
        }
      />
      <SharwaShipNav />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="الحالتان" className="flex flex-wrap items-center gap-x-8 gap-y-2 surface-card p-5 lg:p-6">
            <span className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">أين الشحنة؟</span>
              <span data-testid="detail-status">
                <ShipmentStatusText status={s.status} />
              </span>
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">هل حُصِّلت التكلفة؟</span>
              <BillingText status={s.billing_status} />
            </span>
            {s.status === "label_pending" && s.carrier_code !== "sharwa_ship" ? (
              <Link href="/dashboard/shipping/sharwa-ship/queue" className="text-sm underline underline-offset-4">
                بانتظار تأكيد الملصق — طابور AWB
              </Link>
            ) : null}
          </section>
          <Timeline events={s.events} />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <ManualStatus s={s} refEl={editRef} />
          <Facts s={s} />
          <Items s={s} />
        </aside>
      </div>
    </div>
  );
}

function Facts({ s }: { s: ShipmentDetail }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["العنوان", <bdi key="a">{s.address}</bdi>],
    ["المنطقة", s.zone_name_snapshot],
    ["التكلفة (لقطة)", <Mono key="c">{s.display_cost}</Mono>],
    ["الوزن الفعلي", <span key="w"><Mono>{s.actual_weight_snapshot}</Mono> كغ</span>],
    ["المبلغ عند الاستلام", <Mono key="cod">{s.display_cod_amount}</Mono>],
    ["المندوب", s.agent?.name ?? "بلا إسناد"],
    ["أُنشئت", <Mono key="t" className="text-xs">{formatDateTime(s.created_at)}</Mono>],
  ];
  if (s.master_waybill_number) rows.push(["البوليصة الرئيسة", <Mono key="m">{s.master_waybill_number}</Mono>]);
  return (
    <section aria-label="التفاصيل" className="surface-card">
      <dl className="divide-y divide-border text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-end">{v}</dd>
          </div>
        ))}
      </dl>
      {s.children.length ? (
        <div className="border-t border-border px-4 py-3">
          <p className="pb-2 text-xs text-muted-foreground">
            البوليصات الفرعية <Mono>{s.children.length}</Mono>
          </p>
          <ul className="flex flex-col gap-1.5">
            {s.children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <Link href={`/dashboard/shipping/sharwa-ship/${c.id}`} className="hover:underline">
                  <Mono>{c.waybill_number}</Mono>
                </Link>
                <ShipmentStatusText status={c.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Items({ s }: { s: ShipmentDetail }) {
  return (
    <section aria-label="البنود" className="surface-card">
      <h2 className="border-b border-border px-4 py-2.5 text-sm font-medium">البنود</h2>
      <ul className="divide-y divide-border text-sm">
        {s.items.map((i) => (
          <li key={i.fulfillment_item_id} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="min-w-0 truncate">{i.product_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {i.delivered_quantity !== null ? (
                <>
                  سُلِّم <Mono className="text-foreground">{i.delivered_quantity}</Mono> من <Mono>{i.quantity}</Mono>
                </>
              ) : (
                <>
                  × <Mono className="text-foreground">{i.quantity}</Mono>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ManualStatus({ s, refEl }: { s: ShipmentDetail; refEl: React.RefObject<HTMLDivElement | null> }) {
  const { session } = useAccess();
  const owner = session.kind === "merchant";
  const mutate = useManualStatus(s.id);
  const [result, setResult] = useState<string | null>(null);
  const terminal = s.allowed_transitions.length === 0;

  async function go(to: ShipmentStatus) {
    setResult(null);
    try {
      const r = await mutate.mutateAsync(to);
      if (r.accepted) toast.success(`نُقلت الشحنة إلى «${SHIPMENT_STATUS_LABELS[r.status]}».`);
      else setResult(r.rejection_reason ? REJECTION_LABELS[r.rejection_reason] : "رُفض الحدث.");
    } catch (err) {
      setResult(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    }
  }

  return (
    <section aria-label="تعديل الحالة يدوياً" className="flex flex-col gap-3 surface-card p-5 lg:p-6" ref={refEl} data-testid="manual-status">
      <h2 className="flex items-center justify-between text-sm font-medium">
        تعديل الحالة يدوياً <kbd className="hidden font-mono text-[11px] text-muted-foreground lg:inline">E</kbd>
      </h2>
      {terminal ? (
        <p className="text-sm text-muted-foreground" data-testid="terminal-note">
          حالة نهائية مقفلة.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {SHIPMENT_STATUSES.filter((st) => st !== s.status && st !== "compensated_lost" && st !== "label_pending").map((st) => {
            const allowed = s.allowed_transitions.includes(st);
            return (
              <button
                key={st}
                type="button"
                className={allowed ? primaryButton : outlineButton}
                disabled={!allowed || !owner || mutate.isPending}
                title={!allowed ? `غير مسموح من «${SHIPMENT_STATUS_LABELS[s.status]}»` : !owner ? "التعديل لمالك المتجر" : undefined}
                onClick={() => void go(st)}
                data-testid={`manual-${st}`}
              >
                {SHIPMENT_STATUS_LABELS[st]}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">يُسجَّل بمصدر «تعديل يدوي من التاجر» ويمر بنفس قواعد الانتقال.</p>
      {result ? (
        <p role="alert" className="text-sm text-destructive" data-testid="manual-result">
          {result}
        </p>
      ) : null}
    </section>
  );
}

const LATE_SYNC_MS = 5 * 60_000;

function Timeline({ events }: { events: ShipmentEvent[] }) {
  return (
    <section aria-label="الخط الزمني للأحداث" className="flex flex-col gap-3">
      <h2 className="text-base font-medium">
        الأحداث <Mono className="text-sm text-muted-foreground">{events.length}</Mono>
      </h2>
      {events.length === 0 ? <p className="text-sm text-muted-foreground">لا أحداث بعد.</p> : null}
      <ol className="relative flex flex-col border-s border-border ps-5" data-testid="timeline">
        {events.map((e) => {
          const late = Date.parse(e.received_at) - Date.parse(e.event_time) > LATE_SYNC_MS;
          const bounce = !e.is_rejected && e.from_status === "delivered" && e.to_status === "returned";
          return (
            <li key={e.id} className={cn("relative flex flex-col gap-1 pb-5", e.is_rejected && "text-muted-foreground")} data-testid="timeline-event" data-rejected={e.is_rejected}>
              <span aria-hidden className={cn("absolute -start-[25px] top-1.5 size-2 rounded-full border border-background", e.is_rejected ? "bg-muted-foreground/50" : e.flagged_for_review ? "bg-warning" : "bg-primary")} />
              <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className={cn(!e.is_rejected && "text-foreground")}>
                  {e.from_status ? SHIPMENT_STATUS_LABELS[e.from_status] : "—"} ← {SHIPMENT_STATUS_LABELS[e.to_status]}
                </span>
                <span className="text-xs">· {SOURCE_LABELS[e.source]}</span>
                <span className="text-xs">· {e.actor_name}</span>
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>
                  وقت الحدث <Mono>{formatDateTime(e.event_time)}</Mono>
                </span>
                <span>
                  وصل <Mono>{formatDateTime(e.received_at)}</Mono>
                </span>
                {e.geo ? (
                  <span>
                    الموقع <Mono>{e.geo.lat.toFixed(4)}, {e.geo.lng.toFixed(4)}</Mono>
                    {e.geo.accuracy_m !== null ? <> ± <Mono>{Math.round(e.geo.accuracy_m)}</Mono> م</> : null}
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs">
                {e.is_rejected ? <span data-testid="event-rejected">مرفوض — {e.rejection_reason ? REJECTION_LABELS[e.rejection_reason] : "بلا سبب"}</span> : null}
                {e.out_of_order ? <span className="text-warning">خارج الترتيب</span> : null}
                {e.flagged_for_review ? <span className="text-warning">قيد المراجعة</span> : null}
                {late ? <span data-testid="late-sync">مزامنة متأخرة من الجهاز</span> : null}
                {bounce ? <span className="text-destructive" data-testid="bounce">ارتداد بعد التسليم — يتطلب مراجعة مالية</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
