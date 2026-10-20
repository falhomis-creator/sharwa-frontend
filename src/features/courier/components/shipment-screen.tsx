"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { currentGeo, useAgentShipment, useInvalidateCourier, useMe } from "@/features/courier/api";
import { ActionBar, OfflineNote, StatusText, primaryAction, secondaryAction } from "@/features/courier/components/shell";
import { NoShiftLock, statusTone } from "@/features/courier/components/shipments-screen";
import { Scanner } from "@/features/courier/components/scanner";
import { dispatch, uuid } from "@/features/courier/queue";
import {
  ACTION_LABELS,
  REJECTION_REASONS,
  REJECTION_TEXT,
  STATUS_LABELS,
  TRANSITIONS,
  partialResultSchema,
  transitionResultSchema,
  type AgentShipmentDetail,
  type ShipmentStatus,
} from "@/features/courier/schemas";

/**
 * `/agent/shipments/[id]` (US-38.3, US-38.4): details, the pickup scan, ONE large button
 * per transition the state machine allows from the CURRENT status (FR-38.04), and the
 * partial delivery with COD collection. Every action is born in the offline queue with
 * its `client_generated_uuid`, `event_time` and geo fixed at the tap (FR-38.02/03); a
 * rejection is shown as the server's readable reason and the status shown is the one
 * the server answered with (FR-38.05).
 */
type Banner = { tone: "error" | "info" | "ok"; text: string; testId: string } | null;

const DELIVERY_REJECTIONS = ["رفض العميل الاستلام", "منتج تالف", "منتج غير مطابق", "العميل غير متوفر", "أخرى"];

export function ShipmentScreen({ id }: { id: number }) {
  const me = useMe();
  const q = useAgentShipment(id);
  const invalidate = useInvalidateCourier();
  const [banner, setBanner] = useState<Banner>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [busy, setBusy] = useState(false);

  if (me.data && !me.data.data.open_shift && !me.data.offline) return <NoShiftLock />;
  if (q.isLoading) return <Skeleton className="h-72 w-full" />;
  if (q.error || !q.data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {q.error instanceof Error ? q.error.message : "تعذّر تحميل الشحنة."}
      </p>
    );
  }
  const s = q.data.data;
  const moves = TRANSITIONS[s.status].filter((t) => s.allowed_transitions.includes(t));
  const needsScan = s.status === "pending_pickup" && !scanned;

  async function scan(code: string) {
    if (!s.fulfillment_id) return;
    setBusy(true);
    setBanner(null);
    const r = await dispatch({ kind: "scan", endpoint: `/api/v1/agent/fulfillments/${s.fulfillment_id}/scan-pickup/`, payload: { scanned_code: code }, label: `مسح ${s.waybill_number}`, shipment_id: s.id });
    setBusy(false);
    if (!r.sent) return setBanner({ tone: "info", text: "بلا شبكة — سيُتحقق من الباركود عند عودة الاتصال.", testId: "queued-note" });
    if (r.ok) {
      setMismatch(null);
      setScanned(true);
      return setBanner({ tone: "ok", text: "تطابق الباركود — أكّد الاستلام.", testId: "scan-ok" });
    }
    const body = (r.body ?? {}) as { scan_mismatch?: boolean; rejection_reason?: string };
    if (body.scan_mismatch) setMismatch(r.message);
    else if (body.rejection_reason === "compensated_lost_scan") setBanner({ tone: "error", text: REJECTION_TEXT.compensated_lost_scan, testId: "rejection" });
    else setBanner({ tone: "error", text: r.message, testId: "action-error" });
  }

  async function move(to: ShipmentStatus) {
    setBusy(true);
    setBanner(null);
    // Fixed at the tap, reused verbatim by every resend (FR-38.02/03).
    const payload = { to_status: to, client_generated_uuid: uuid(), event_time: new Date().toISOString(), ...(await currentGeo()) };
    const r = await dispatch({ kind: "status", endpoint: `/api/v1/agent/shipments/${s.id}/status/`, payload, label: `${ACTION_LABELS[to]} — ${s.waybill_number}`, shipment_id: s.id });
    setBusy(false);
    if (!r.sent) return setBanner({ tone: "info", text: "بلا شبكة — حُفظ الإجراء وسيُرسل عند عودة الاتصال.", testId: "queued-note" });
    if (!r.ok) return setBanner({ tone: "error", text: r.message, testId: "action-error" });
    const res = transitionResultSchema.safeParse(r.data);
    if (res.success && !res.data.accepted) {
      const reason = res.data.rejection_reason;
      setBanner({ tone: "error", text: reason && (REJECTION_REASONS as readonly string[]).includes(reason) ? REJECTION_TEXT[reason] : "رُفض الحدث.", testId: "rejection" });
    } else if (res.success) {
      setBanner({ tone: "ok", text: `${STATUS_LABELS[res.data.status]}${res.data.flagged_for_review ? " — قيد المراجعة" : ""}.`, testId: "move-ok" });
      setScanned(false);
    }
    void invalidate();
  }

  return (
    <div className="flex flex-col gap-4" data-testid="agent-shipment-detail">
      <Link href="/agent/shipments" className="inline-flex min-h-12 items-center gap-1 self-start text-sm text-muted-foreground">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> شحناتي
      </Link>
      <OfflineNote snap={q.data} />
      {mismatch ? (
        <div role="alert" className="sticky top-14 z-10 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive" data-testid="scan-mismatch">
          <p className="font-medium">عدم تطابق الباركود</p>
          <p>{mismatch}</p>
        </div>
      ) : null}
      <section className="flex flex-col gap-2 surface-card p-5 lg:p-6" aria-label="الشحنة">
        <span className="flex items-center justify-between gap-2">
          <Mono className="text-lg" data-testid="waybill">
            {s.waybill_number}
          </Mono>
          <span data-testid="agent-status">
            <StatusText label={STATUS_LABELS[s.status]} tone={statusTone(s.status)} />
          </span>
        </span>
        {s.flagged_for_review ? <span className="text-xs text-warning" data-testid="flagged">قيد المراجعة</span> : null}
        <span className="text-base font-medium">{s.customer_name}</span>
        <span className="text-sm text-muted-foreground">
          <bdi>{s.address}</bdi>
        </span>
        <span className="flex items-center justify-between border-t border-border pt-2 text-sm">
          <span className="text-muted-foreground">المطلوب تحصيله</span>
          <Mono className="text-base">{s.display_cod_amount}</Mono>
        </span>
      </section>

      {banner ? (
        <p role={banner.tone === "error" ? "alert" : "status"} className={cn("rounded-md border p-3 text-sm", banner.tone === "error" ? "border-destructive/40 text-destructive" : "border-border")} data-testid={banner.testId}>
          {banner.text}
        </p>
      ) : null}

      {s.status === "pending_pickup" || s.status === "compensated_lost" ? (
        <section aria-label="مسح الاستلام" className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">مسح الاستلام من المخزن</h2>
          <Scanner onCode={(c) => void scan(c)} busy={busy} />
        </section>
      ) : null}

      {delivering ? <Delivery s={s} onDone={() => setDelivering(false)} /> : null}

      <section aria-label="البنود" className="surface-card">
        <h2 className="border-b border-border px-4 py-2.5 text-sm font-medium">البنود</h2>
        <ul className="divide-y divide-border text-sm">
          {s.items.map((i) => (
            <li key={i.fulfillment_item_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 truncate">{i.product_name}</span>
              <Mono className="shrink-0 text-muted-foreground">
                {i.delivered_quantity !== null ? `${i.delivered_quantity}/` : "×"}
                {i.quantity}
              </Mono>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="الأحداث" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">الأحداث</h2>
        <ol className="flex flex-col gap-2 border-s border-border ps-4 text-xs">
          {[...s.events].map((e) => (
            <li key={e.id} className={cn(e.is_rejected && "text-muted-foreground")}>
              <span className="text-sm">
                {e.from_status ? STATUS_LABELS[e.from_status] : "—"} ← {STATUS_LABELS[e.to_status]}
              </span>
              {e.is_rejected ? <span> · مرفوض</span> : null}
              <span className="block text-muted-foreground">
                <Mono>{formatDateTime(e.event_time)}</Mono> · {e.actor_name}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {!delivering ? (
        <ActionBar>
          {moves.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground" data-testid="terminal">
              حالة نهائية — لا إجراءات.
            </p>
          ) : (
            <div className={cn("grid gap-2", moves.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {moves.map((to, i) => {
                const deliver = to === "delivered";
                const blocked = needsScan && to === "picked_up";
                return (
                  <button
                    key={to}
                    type="button"
                    className={i === 0 ? primaryAction : secondaryAction}
                    disabled={busy || blocked || Boolean(mismatch && to === "picked_up")}
                    title={blocked ? "امسح الباركود أولاً" : undefined}
                    onClick={() => (deliver ? setDelivering(true) : void move(to))}
                    data-testid={`move-${to}`}
                  >
                    {ACTION_LABELS[to]}
                  </button>
                );
              })}
            </div>
          )}
        </ActionBar>
      ) : null}
    </div>
  );
}

/** Partial delivery (US-38.4, FR-38.07): every line is sent, with a reason below its quantity. */
function Delivery({ s, onDone }: { s: AgentShipmentDetail; onDone: () => void }) {
  const invalidate = useInvalidateCourier();
  const [qty, setQty] = useState<Record<number, number>>(() => Object.fromEntries(s.items.map((i) => [i.fulfillment_item_id, i.quantity])));
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [confirmFail, setConfirmFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [key] = useState(() => uuid());
  const allRejected = s.items.every((i) => (qty[i.fulfillment_item_id] ?? 0) === 0);
  const missingReason = s.items.some((i) => (qty[i.fulfillment_item_id] ?? 0) < i.quantity && !reasons[i.fulfillment_item_id]);

  async function submit() {
    if (missingReason) return setError("اختر سبب الرفض لكل بند لم يُسلَّم كاملاً.");
    if (allRejected && !confirmFail) return setConfirmFail(true);
    setBusy(true);
    setError(null);
    const payload = {
      line_items: s.items.map((i) => ({ fulfillment_item_id: i.fulfillment_item_id, delivered_quantity: qty[i.fulfillment_item_id] ?? 0, rejection_reason: (qty[i.fulfillment_item_id] ?? 0) < i.quantity ? (reasons[i.fulfillment_item_id] ?? "") : "" })),
      client_generated_uuid: key,
      event_time: new Date().toISOString(),
      ...(await currentGeo()),
    };
    const r = await dispatch({ uuid: key, kind: "partial", endpoint: `/api/v1/agent/fulfillments/${s.fulfillment_id}/partial-delivery/`, payload, label: `تسليم ${s.waybill_number}`, shipment_id: s.id });
    setBusy(false);
    if (!r.sent) return setResult("بلا شبكة — حُفظ التسليم وسيُرسل بنفس المعرّف عند عودة الاتصال.");
    if (!r.ok) {
      const body = (r.body ?? {}) as { rejection_reason?: string; line_items?: string[] };
      const reason = body.rejection_reason && (REJECTION_REASONS as readonly string[]).includes(body.rejection_reason) ? ` — ${REJECTION_TEXT[body.rejection_reason as keyof typeof REJECTION_TEXT]}` : "";
      return setError(body.line_items?.join(" ") || `${r.message}${reason}`);
    }
    const res = partialResultSchema.safeParse(r.data);
    if (res.success) setResult(`${res.data.duplicate ? "سُجِّل مسبقاً (إعادة إرسال) — " : ""}المحصَّل ${res.data.display_collected_amount ?? `${res.data.collected_amount} ${res.data.currency}`} · مُسلَّم ${res.data.delivered} · مرفوض ${res.data.rejected}`);
    void invalidate();
  }

  return (
    <section aria-label="التسليم" className="flex flex-col gap-3 surface-card border-primary p-5" data-testid="delivery-form">
      <h2 className="text-base font-medium">تسليم وتحصيل</h2>
      {s.items.map((i) => {
        const n = qty[i.fulfillment_item_id] ?? 0;
        return (
          <div key={i.fulfillment_item_id} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0" data-testid="delivery-line">
            <span className="text-sm">{i.product_name}</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="إنقاص" className="inline-flex size-12 items-center justify-center rounded-lg border border-border" onClick={() => setQty({ ...qty, [i.fulfillment_item_id]: Math.max(0, n - 1) })} data-testid="qty-minus">
                <Minus className="size-5" aria-hidden />
              </button>
              <Mono className="w-16 text-center text-lg" data-testid="qty">
                {n}/{i.quantity}
              </Mono>
              <button type="button" aria-label="زيادة" className="inline-flex size-12 items-center justify-center rounded-lg border border-border" onClick={() => setQty({ ...qty, [i.fulfillment_item_id]: Math.min(i.quantity, n + 1) })}>
                <Plus className="size-5" aria-hidden />
              </button>
            </div>
            {n < i.quantity ? (
              <NativeSelect aria-label="سبب الرفض" className="h-12" value={reasons[i.fulfillment_item_id] ?? ""} onChange={(e) => setReasons({ ...reasons, [i.fulfillment_item_id]: e.target.value })} data-testid="reject-reason">
                <option value="">سبب الرفض…</option>
                {DELIVERY_REJECTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
          </div>
        );
      })}
      {confirmFail ? (
        <p role="alert" className="text-sm text-warning" data-testid="confirm-fail">
          كل البنود مرفوضة — سيُسجَّل كتسليم فاشل. اضغط «تأكيد» مرة أخرى للإرسال.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive" data-testid="delivery-error">
          {error}
        </p>
      ) : null}
      {result ? (
        <p role="status" className="text-sm" data-testid="delivery-result">
          {result}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={secondaryAction} onClick={onDone}>
          {result ? "إغلاق" : "رجوع"}
        </button>
        <button type="button" className={primaryAction} disabled={busy || Boolean(result)} onClick={() => void submit()} data-testid="delivery-submit">
          {confirmFail ? "تأكيد" : "إرسال التسليم"}
        </button>
      </div>
    </section>
  );
}
