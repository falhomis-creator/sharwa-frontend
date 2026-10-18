"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Gift, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { formatDateTime, formatNumber, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import {
  FULFILLMENT_STATE_LABELS,
  PAYMENT_INTENT_METHOD_LABELS,
  PAYMENT_INTENT_STATUS_LABELS,
  REFUND_METHOD_LABELS,
  SALES_CHANNEL_LABELS,
  TIMELINE_SOURCE_LABELS,
  TRAFFIC_SOURCE_LABELS,
  type OrderStatusDef,
} from "@/features/orders/schemas";
import { ordersApi, useOrder, useOrderStatuses } from "@/features/orders/api";
import { useOrderWrite } from "@/features/orders/hooks/use-order-write";
import { ConflictPanel } from "@/features/orders/components/conflict-panel";
import { FulfillmentMenu } from "@/features/orders/components/fulfillment-menu";
import { FinancialStatus, PaymentStatusText } from "@/features/orders/components/order-status";
import { FinancialStatusControl, GiftNoteDialog, PaymentReview, PickupDialog, RefundDialog } from "@/features/orders/components/order-actions";
import { ProductThumb } from "@/features/products/components/product-thumb";

/**
 * ONE order detail component for the side sheet and the full page (FR-06.08, T077):
 * header with both status axes · items (`<Money>` from `display_*`) · invoice · fulfilments
 * per location · payments + receipt review · refunds · timeline (FR-06.09) · customer with
 * the COD trust signal · gift recipient apart from the buyer (US-06.2.3).
 *
 * Shortcuts while it is open (M06 §6): `E` opens the fulfilment menu, `P` prints.
 */
function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
}

function Section({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function InvoiceRow({ label, value, strong = false, testId }: { label: string; value: string | null; strong?: boolean; testId?: string }) {
  if (!value) return null;
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1", strong && "border-t border-border pt-2 font-medium")} data-testid={testId}>
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd>
        <Money value={value} />
      </dd>
    </div>
  );
}

export function OrderDetailView({ orderId, variant }: { orderId: number; variant: "sheet" | "page" }) {
  const query = useOrder(orderId);
  const statuses = useOrderStatuses().data ?? [];
  const { canPermission } = useAccess();
  const canEdit = canPermission("orders.update_status");
  const canRefund = canPermission("orders.refund");
  const write = useOrderWrite();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"refund" | "pickup" | "gift" | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      // In the sheet the dialog IS the sheet; on the page any open dialog wins.
      if (variant === "page" && document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "e") {
        e.preventDefault();
        setMenuOpen(true);
      } else if (k === "p") {
        e.preventDefault();
        window.open(`/dashboard/orders/${orderId}/print`, "_blank", "noopener");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orderId, variant]);

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-1" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const o = query.data;

  function changeFulfillment(target: OrderStatusDef) {
    void write.run(o.id, o.version, (v) => ordersApi.setFulfillment(o.id, target.id, v), {
      success: `حالة التنفيذ: «${target.name}»`,
      label: `حالة التنفيذ → ${target.name}`,
    });
  }

  const delivered = o.fulfillments.filter((f) => f.status === "delivered").length;
  const open = o.status !== "completed" && o.status !== "cancelled" && o.status !== "refunded";

  const main = (
    <div className="flex min-w-0 flex-col gap-6">
      <Section title={`العناصر (${o.items.length})`}>
        <ul className="rounded-lg border border-border" data-testid="order-items">
          {o.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 border-b border-border p-2.5 last:border-0">
              <ProductThumb src={it.product_image_snapshot} name={it.product_name} size={40} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm">
                  {it.product_id && !it.product_deleted ? (
                    <Link href={`/dashboard/products/${it.product_id}`} className="truncate hover:underline">
                      {it.product_name}
                    </Link>
                  ) : (
                    <span className="truncate">{it.product_name}</span>
                  )}
                  {it.product_deleted ? <span className="rounded border border-border px-1 text-[11px] text-muted-foreground">محذوف</span> : null}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {it.variant_label ? <span>{it.variant_label}</span> : null}
                  <Mono>{it.sku_snapshot}</Mono>
                  {o.fulfillments.length > 1 && it.source_location ? <span>· {it.source_location.name}</span> : null}
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5 text-sm">
                <Money value={it.display_line_total} />
                <span className="text-xs text-muted-foreground">
                  <Mono>{formatNumber(Number(it.quantity), 3)}</Mono> × <Money value={it.display_price} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="الفاتورة">
        <dl className="flex flex-col text-sm" data-testid="invoice">
          <InvoiceRow label="المجموع الفرعي" value={o.invoice.display_subtotal} />
          <InvoiceRow label="الخصم" value={o.invoice.display_discount} />
          <InvoiceRow label="العرض الترويجي" value={o.invoice.display_promotion_discount} />
          {o.invoice.coupon_code ? (
            <div className="flex justify-between py-1">
              <dt className="text-muted-foreground">الكوبون</dt>
              <dd>
                <Mono>{o.invoice.coupon_code}</Mono>
              </dd>
            </div>
          ) : null}
          <InvoiceRow label="الشحن" value={o.invoice.display_delivery_fee} />
          <InvoiceRow label="المحفظة المستخدمة" value={o.invoice.display_wallet_used} />
          <InvoiceRow label="العربون" value={o.invoice.display_deposit} />
          <InvoiceRow label="الإجمالي" value={o.invoice.display_total} strong />
          <InvoiceRow label="مدفوع مقدماً" value={o.invoice.display_upfront_paid} testId="upfront-paid" />
          <InvoiceRow label="المستحق عند الاستلام" value={o.invoice.display_amount_on_delivery} testId="due-on-delivery" />
          <InvoiceRow label="المسترد" value={o.invoice.display_refunded} />
        </dl>
        {o.exchange_rate_locked ? <p className="text-xs text-muted-foreground">سعر الصرف المثبَّت عند الطلب: <Mono>{o.exchange_rate_locked}</Mono></p> : null}
      </Section>

      <Section title="التنفيذ">
        {o.fulfillments.length > 1 ? (
          <p className="text-sm text-muted-foreground" data-testid="fulfillment-summary">
            {delivered === o.fulfillments.length ? "وصلت كل الشحنات" : `قيد التنفيذ الجزئي (${delivered} من ${o.fulfillments.length} شحنات وصلت)`}
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {o.fulfillments.map((f) => (
            <div key={f.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-3 text-sm" data-testid="fulfillment-card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{f.location.name}</span>
                <span className={cn("text-xs", f.status === "delivered" ? "text-success" : f.status === "cancelled" ? "text-destructive" : "text-muted-foreground")}>
                  {FULFILLMENT_STATE_LABELS[f.status]}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                <Mono>{f.item_ids.length}</Mono> عناصر
                {f.tracking_number ? (
                  <>
                    {" "}
                    · {f.shipping_provider} <Mono>{f.tracking_number}</Mono>
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <PaymentReview order={o} write={write} canEdit={canEdit} />

      <Section
        title="المدفوعات والاسترجاع"
        action={
          canRefund && o.payment_status !== "unpaid" && Number(o.refundable_amount) > 0 ? (
            <Button variant="outline" size="sm" className="h-11 lg:h-8" onClick={() => setDialog("refund")} data-testid="open-refund">
              استرجاع مبلغ
            </Button>
          ) : null
        }
      >
        <ul className="flex flex-col text-sm">
          {o.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
              <span className="flex flex-col">
                <span>{PAYMENT_INTENT_METHOD_LABELS[p.method]}</span>
                <span className="text-xs text-muted-foreground">
                  {PAYMENT_INTENT_STATUS_LABELS[p.status]}
                  {p.gateway_transaction_id ? (
                    <>
                      {" "}
                      · <Mono>{p.gateway_transaction_id}</Mono>
                    </>
                  ) : null}
                </span>
              </span>
              <Money value={p.display_amount} />
            </li>
          ))}
          {o.refunds.map((r) => (
            <li key={`r${r.id}`} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0" data-testid="refund-row">
              <span className="flex flex-col">
                <span>استرجاع · {REFUND_METHOD_LABELS[r.method]}</span>
                <span className="text-xs text-muted-foreground">
                  {r.reason} · {r.actor}
                </span>
              </span>
              <Money value={`− ${r.display_amount}`} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="الجدول الزمني">
        <ol className="flex flex-col" data-testid="timeline">
          {[...o.timeline]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((ev) => (
              <li key={ev.id} className="relative flex gap-3 border-s border-border pb-4 ps-4 last:pb-0">
                <span aria-hidden className="absolute -start-[3.5px] top-1.5 size-1.5 rounded-full bg-foreground" />
                <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span>{ev.text}</span>
                  <span className="text-xs text-muted-foreground">
                    <time dateTime={ev.at} title={formatDateTime(ev.at)}>
                      {formatRelative(ev.at, now)}
                    </time>{" "}
                    · {TIMELINE_SOURCE_LABELS[ev.source]}
                    {ev.actor ? ` · ${ev.actor}` : ""}
                  </span>
                </span>
              </li>
            ))}
        </ol>
      </Section>
    </div>
  );

  const side = (
    <div className="flex min-w-0 flex-col gap-6">
      <Section title="العميل">
        <div className="flex flex-col gap-1 text-sm" data-testid="customer">
          <span className="font-medium">{o.customer_name}</span>
          <Mono className="self-start text-muted-foreground">{prettyPhone(o.customer_phone)}</Mono>
          {o.customer_email ? <span className="text-muted-foreground">{o.customer_email}</span> : null}
          {o.address ? <span className="text-muted-foreground">{o.address}</span> : null}
          {o.trust ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="cod-trust">
              ثقة الدفع عند الاستلام: <Mono className="text-foreground">{o.trust.successful_cod_orders}</Mono> ناجحة ·{" "}
              <Mono className={o.trust.failed_cod_orders > 0 ? "text-destructive" : "text-foreground"}>{o.trust.failed_cod_orders}</Mono> فاشلة · مخاطرة{" "}
              <Mono className={Number(o.trust.risk_percentage) >= 30 ? "text-warning" : "text-foreground"}>{o.trust.risk_percentage}%</Mono>
            </p>
          ) : null}
        </div>
      </Section>

      {o.is_gift ? (
        <Section
          title="الهدية"
          action={
            canEdit && open ? (
              <Button variant="ghost" size="sm" className="h-11 lg:h-7" onClick={() => setDialog("gift")}>
                تعديل الرسالة
              </Button>
            ) : null
          }
        >
          <div className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm" data-testid="gift">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="size-3.5" aria-hidden /> المستلم (غير المشتري)
            </span>
            <span className="font-medium">{o.recipient_name ?? "—"}</span>
            {o.recipient_phone ? <Mono className="self-start text-muted-foreground">{prettyPhone(o.recipient_phone)}</Mono> : null}
            {o.gift_message ? <p className="mt-1 border-s-2 border-border ps-2 text-muted-foreground">«{o.gift_message}»</p> : null}
          </div>
        </Section>
      ) : null}

      <Section
        title="التوصيل"
        action={
          canEdit && open && !o.pickup_location && !o.locked_reason ? (
            <Button variant="ghost" size="sm" className="h-11 lg:h-7" onClick={() => setDialog("pickup")} data-testid="open-pickup">
              تحويل إلى استلام
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-1 text-sm">
          {o.pickup_location ? <span>استلام من «{o.pickup_location.name}»</span> : <span>{o.delivery_method_name ?? "—"}</span>}
          {o.tracking_number ? (
            <span className="text-muted-foreground">
              رقم التتبع <Mono>{o.tracking_number}</Mono>
            </span>
          ) : null}
          {o.is_backordered ? <span className="text-warning">طلب مسبق: بعض العناصر غير متوفرة بعد</span> : null}
        </div>
      </Section>

      {o.pending_approval ? (
        <Section title="موافقة الجملة">
          <p className="text-sm">
            طلب موافقة <Mono>#{o.pending_approval.id}</Mono> —{" "}
            {o.pending_approval.status === "pending" ? "بانتظار الموافقة" : o.pending_approval.status === "approved" ? "مُعتمد" : "مرفوض"}
          </p>
        </Section>
      ) : null}

      <Section title="المصدر">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">القناة</dt>
          <dd>{SALES_CHANNEL_LABELS[o.sales_channel]}</dd>
          {o.traffic_source ? (
            <>
              <dt className="text-muted-foreground">الزيارة</dt>
              <dd>{TRAFFIC_SOURCE_LABELS[o.traffic_source]}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">رقم التتبع العام</dt>
          <dd>
            <Mono className="text-xs">{o.public_uuid}</Mono>
          </dd>
        </dl>
      </Section>
    </div>
  );

  return (
    <div className="flex flex-col gap-5" data-testid="order-detail" data-order-id={o.id} data-version={o.version}>
      <header className="flex flex-col gap-3">
        <div className={cn("flex flex-wrap items-baseline justify-between gap-2", variant === "sheet" && "pe-10")}>
          <div className="flex items-baseline gap-2">
            <h2 className={cn("font-semibold", variant === "page" ? "text-2xl md:text-3xl" : "text-xl")}>
              الطلب <Mono>#{o.id}</Mono>
            </h2>
            <span className="text-sm text-muted-foreground" title={formatDateTime(o.created_at)}>
              {formatRelative(o.created_at, now)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/orders/${o.id}/print`}
              target="_blank"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-8"
              data-testid="print-link"
            >
              <Printer className="size-4" aria-hidden /> طباعة
            </Link>
            {variant === "sheet" ? (
              <Link
                href={`/dashboard/orders/${o.id}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted lg:h-8"
              >
                <ExternalLink className="size-4" aria-hidden /> صفحة كاملة
              </Link>
            ) : null}
            {canEdit && open && !o.locked_reason ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-11 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted lg:h-8">المزيد</DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!o.pickup_location ? <DropdownMenuItem onClick={() => setDialog("pickup")}>تحويل إلى استلام</DropdownMenuItem> : null}
                  <DropdownMenuItem onClick={() => setDialog("gift")}>{o.is_gift ? "تعديل رسالة الهدية" : "إضافة ملاحظة هدية"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">المالية</span>
            <FinancialStatus status={o.status} />
          </span>
          <span className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">التنفيذ</span>
            <FulfillmentMenu order={o} statuses={statuses} canEdit={canEdit} onSelect={changeFulfillment} open={menuOpen} onOpenChange={setMenuOpen} />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">الدفع</span>
            <PaymentStatusText status={o.payment_status} />
          </span>
          <span className="ms-auto text-base">
            <Money value={o.display_total} className="font-medium" />
          </span>
        </div>
        {o.locked_reason ? <p className="text-sm text-muted-foreground" role="note">{o.locked_reason}</p> : null}
        <div className="flex flex-wrap gap-2">
          <FinancialStatusControl order={o} write={write} canEdit={canEdit} />
        </div>
        <ConflictPanel conflict={write.conflict} onRetry={() => void write.retryConflict()} onDismiss={write.dismissConflict} pending={write.pending} />
      </header>

      {variant === "page" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {main}
          {side}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {side}
          {main}
        </div>
      )}

      <RefundDialog order={o} write={write} open={dialog === "refund"} onOpenChange={(v) => setDialog(v ? "refund" : null)} />
      <PickupDialog order={o} write={write} open={dialog === "pickup"} onOpenChange={(v) => setDialog(v ? "pickup" : null)} />
      {dialog === "gift" ? <GiftNoteDialog key={o.version} order={o} write={write} open onOpenChange={(v) => setDialog(v ? "gift" : null)} /> : null}
    </div>
  );
}

