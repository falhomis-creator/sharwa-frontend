"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CheckIcon, CopyIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime, prettyPhone } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { SHIPMENT_STEPS, TrackingSchema, type Tracking } from "@/features/tracking/schemas";
import { ProductImage } from "@/features/storefront/components/product-image";
import { useStorefront } from "@/features/storefront/components/storefront-provider";

/**
 * Public order tracking (M41, T093). The two axes stay separate (FR-41.02): the FINANCIAL
 * status in Arabic, the merchant's FULFILMENT status as its name plus a dot in its colour
 * (colour is data and is used for the dot only — the text stays `foreground`). Then one card
 * per fulfilment: its items, its state and, when shipped, a vertical timeline of the
 * shipment newest-last on the path with the events below it. Polls every 60 s while a
 * shipment is moving and stops on final states (FR-41.07).
 */
const ACTIVE = new Set(["picked_up", "in_transit", "pending_pickup", "label_pending"]);

export function TrackingView({ initial, timezone }: { initial: Tracking; timezone: string }) {
  const { store, whatsapp } = useStorefront();
  const q = useQuery({
    queryKey: storeKey(store, "track", initial.public_uuid),
    queryFn: () => apiFetch(`/api/bff/orders/track/${encodeURIComponent(initial.public_uuid)}`, TrackingSchema),
    initialData: initial,
    refetchInterval: (query) => (query.state.data?.fulfillments.some((f) => f.shipment && ACTIVE.has(f.shipment.status)) ? 60_000 : false),
  });
  const t = q.data;
  const ended = t.status === "cancelled" || t.status === "refunded";
  const anyCourier = t.fulfillments.find((f) => f.shipment?.courier && (f.shipment.status === "picked_up" || f.shipment.status === "in_transit"))?.shipment?.courier;
  const waText = encodeURIComponent(`مرحباً، أستفسر عن طلبي رقم ${t.order_number}`);
  const returnText = encodeURIComponent(`مرحباً، أرغب في إرجاع منتج من الطلب رقم ${t.order_number}`);
  const pickupCode = t.fulfillments.find((f) => f.pickup_code)?.pickup_code ?? null;

  return (
    <div className="space-y-6 pb-24 md:pb-0" data-testid="tracking" data-status={t.status}>
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          طلب <Mono className="text-base font-semibold text-foreground">#{t.order_number}</Mono>
          <span className="mx-2">·</span>
          <span className="tabular-nums">{formatDateTime(t.created_at, timezone)}</span>
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl" data-testid="tracking-rollup">
          {ended ? t.status_label : t.rollup_label}
        </h1>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {t.fulfillment_status && !ended ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">حالة التنفيذ</dt>
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: t.fulfillment_status.color }} />
              <dd className="font-medium">{t.fulfillment_status.name}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">الحالة المالية</dt>
            <dd className="text-muted-foreground">{t.status_label}</dd>
          </div>
        </dl>
        {(t.status === "awaiting_payment" || t.status === "payment_review") && t.display_total ? (
          <p className="text-sm text-warning">
            بانتظار تأكيد الدفع — المبلغ المطلوب <Money value={t.display_total} />
          </p>
        ) : null}
        {t.is_gift ? (
          <div className="store-frame rounded-xl border-border p-4 text-sm shadow-card bg-card">
            <p className="font-medium">هدية إلى {t.recipient_name}</p>
            {t.gift_message ? <p className="mt-1 leading-7 text-muted-foreground">«{t.gift_message}»</p> : null}
          </div>
        ) : null}
      </header>

      {pickupCode ? <PickupCode code={pickupCode} location={t.pickup_location} /> : null}

      <ol className="space-y-4" aria-label="الشحنات">
        {t.fulfillments.map((f, i) => (
          <li key={f.id} className="store-frame space-y-4 rounded-xl border-border p-4 md:p-5 shadow-card bg-card" data-testid="fulfillment">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{t.fulfillments.length > 1 ? `الشحنة ${i + 1} من ${t.fulfillments.length}` : "طلبك"}</h2>
              <span className={cn("text-sm", f.status === "delivered" ? "text-success" : f.status === "cancelled" ? "text-destructive" : "text-muted-foreground")}>
                {f.status === "forwarded_to_supplier" ? "يُجهَّز من المورد" : f.status_label}
              </span>
            </div>
            <ul className="space-y-2">
              {f.items.map((it, k) => (
                <li key={k} className="flex items-center gap-3 text-sm">
                  <div className="w-12 shrink-0 overflow-hidden rounded-md">
                    <ProductImage src={it.image} alt={it.product_name} sizes="48px" thumb />
                  </div>
                  <span className="flex-1">
                    {it.product_name}
                    {it.variant_label ? <span className="text-muted-foreground"> · {it.variant_label}</span> : null}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">×{it.quantity}</span>
                </li>
              ))}
            </ul>
            {f.shipment ? <ShipmentTimeline shipment={f.shipment} timezone={timezone} /> : !ended && f.status !== "delivered" && f.status !== "ready_for_pickup" ? (
              <p className="text-sm text-muted-foreground">سنُشعرك عند الشحن.</p>
            ) : null}
          </li>
        ))}
      </ol>

      {!t.is_gift && t.display_total ? (
        <dl className="store-frame divide-y divide-border rounded-xl border-border text-sm shadow-card bg-card">
          <div className="flex justify-between p-4">
            <dt className="text-muted-foreground">الإجمالي</dt>
            <dd className="font-semibold">
              <Money value={t.display_total} />
            </dd>
          </div>
          {t.display_deposit_amount ? (
            <div className="flex justify-between p-4">
              <dt className="text-muted-foreground">العربون</dt>
              <dd>
                <Money value={t.display_deposit_amount} />
              </dd>
            </div>
          ) : null}
          {t.display_amount_on_delivery ? (
            <div className="flex justify-between p-4">
              <dt className="text-muted-foreground">عند الاستلام</dt>
              <dd>
                <Money value={t.display_amount_on_delivery} />
              </dd>
            </div>
          ) : null}
          {t.customer_name ? (
            <div className="flex justify-between gap-3 p-4">
              <dt className="text-muted-foreground">المستلم</dt>
              <dd className="text-end">
                {t.customer_name}
                {t.customer_phone_masked ? (
                  <span dir="ltr" className="block font-mono text-xs text-muted-foreground">
                    {t.customer_phone_masked}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {t.address_text ? (
            <div className="flex justify-between gap-3 p-4">
              <dt className="text-muted-foreground">العنوان</dt>
              <dd className="text-end">{t.address_text}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {whatsapp ? (
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), "h-11 w-full gap-2 px-5 sm:w-auto")}>
            <MessageCircleIcon aria-hidden />
            تواصل مع المتجر عبر واتساب
          </a>
        ) : null}
        {anyCourier ? (
          <a href={`tel:+${anyCourier.phone}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full gap-2 px-5 sm:w-auto")}>
            <PhoneIcon aria-hidden />
            اتصل بالمندوب
          </a>
        ) : null}
        {whatsapp && !ended ? (
          <a href={`https://wa.me/${whatsapp}?text=${returnText}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost" }), "h-11 w-full px-5 sm:w-auto")}>
            طلب إرجاع
          </a>
        ) : null}
      </div>
      {t.return_policy_excerpt ? (
        <footer className="border-t border-border pt-4 text-sm text-muted-foreground">
          <p className="leading-7">{t.return_policy_excerpt}</p>
          <Link href="/about#returns" className="store-link inline-flex min-h-11 items-center">
            سياسة الاسترجاع كاملة
          </Link>
        </footer>
      ) : null}
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRightIcon aria-hidden className="size-4 ltr:rotate-180" />
        العودة إلى المتجر
      </Link>
    </div>
  );
}

function ShipmentTimeline({ shipment, timezone }: { shipment: NonNullable<Tracking["fulfillments"][number]["shipment"]>; timezone: string }) {
  const terminal = ["returned", "cancelled", "compensated_lost"].includes(shipment.status);
  const reached = new Set(shipment.events.map((e) => e.to_status));
  const currentIdx = SHIPMENT_STEPS.findIndex((s) => s.status === shipment.status);
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {shipment.carrier_name ?? shipment.carrier_code} · البوليصة <Mono className="text-foreground">{shipment.waybill_number}</Mono>
        </span>
      </p>
      <ol className="relative space-y-3 ps-6" aria-label="مسار الشحنة">
        <span aria-hidden className="absolute inset-y-1 start-[7px] w-px bg-border" />
        {SHIPMENT_STEPS.map((step, i) => {
          const done = reached.has(step.status) || (currentIdx >= 0 && i < currentIdx);
          const current = !terminal && step.status === shipment.status;
          if (terminal && !done) return null;
          return (
            <li key={step.status} className="relative text-sm" aria-current={current ? "step" : undefined}>
              <span
                aria-hidden
                className={cn(
                  "absolute -start-6 top-1 size-3.5 rounded-full border-2 border-background",
                  done || current ? "bg-foreground" : "bg-muted ring-1 ring-border",
                  current && "motion-safe:animate-pulse",
                )}
              />
              <span className={done || current ? "font-medium" : "text-muted-foreground"}>{step.label}</span>
            </li>
          );
        })}
        {terminal ? (
          <li className="relative text-sm">
            <span aria-hidden className="absolute -start-6 top-1 size-3.5 rounded-full border-2 border-background bg-warning" />
            <span className={shipment.status === "compensated_lost" ? "font-medium text-destructive" : "font-medium text-warning"}>{shipment.status_label}</span>
            {shipment.explanation ? <p className="mt-1 text-muted-foreground">{shipment.explanation}</p> : null}
          </li>
        ) : null}
      </ol>
      <ul className="space-y-1 text-xs text-muted-foreground" aria-label="أحداث الشحنة">
        {shipment.events.map((e) => (
          <li key={`${e.to_status}-${e.event_time}`} className="flex justify-between gap-3">
            <span>{SHIPMENT_STEPS.find((s) => s.status === e.to_status)?.label ?? e.to_status}</span>
            <span className="tabular-nums">{formatDateTime(e.event_time, timezone)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** US-41.3 — 32px Mono code with a keyboard-reachable copy that announces itself (FR-41.11). Fixed at the bottom on phones. */
function PickupCode({ code, location }: { code: string; location: Tracking["pickup_location"] }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="store-frame fixed inset-x-0 bottom-0 z-30 space-y-2 border-x-0 border-b-0 border-border bg-background p-4 md:static md:rounded-xl md:border-x md:border-b" aria-label="رمز الاستلام" data-testid="pickup-code">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">أظهر هذا الرمز عند الاستلام</p>
          <p dir="ltr" className="font-mono text-[32px] font-semibold leading-tight tracking-[0.2em] tabular-nums">
            {code}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 gap-2"
          onClick={async () => {
            await navigator.clipboard?.writeText(code).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? "نُسخ" : "نسخ"}
        </Button>
        <span className="sr-only" aria-live="polite">
          {copied ? "نُسخ رمز الاستلام" : ""}
        </span>
      </div>
      {location ? (
        <p className="text-sm text-muted-foreground">
          {location.name} — {location.address}
          {location.phone ? (
            <span dir="ltr" className="ms-2 font-mono text-xs">
              {prettyPhone(location.phone)}
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
