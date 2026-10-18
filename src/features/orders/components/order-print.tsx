"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { formatDateTime, formatNumber, prettyPhone } from "@/lib/format";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { useOrder } from "@/features/orders/api";

/**
 * The waybill (FR-06.10): one A4 RTL sheet — sender, recipient (the gift recipient when it is
 * a gift, WITHOUT prices), items, the amount to collect on delivery and the tracking id.
 * Toolbar is `print:hidden`; nothing else on the page carries colour.
 */
export function OrderPrint({ orderId }: { orderId: number }) {
  const session = useSession();
  const query = useOrder(orderId);
  if (query.isLoading) return <Skeleton className="h-[60vh]" />;
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const o = query.data;
  const gift = o.is_gift;
  const collect = o.invoice.display_amount_on_delivery ?? (o.payment_status === "unpaid" ? o.invoice.display_total : null);

  return (
    <article className="flex flex-col gap-6 text-sm" data-testid="order-print">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <p className="text-muted-foreground">معاينة الطباعة — A4</p>
        <Button size="lg" className="h-11 gap-1.5 lg:h-9" onClick={() => window.print()} data-testid="print-now">
          <Printer className="size-4" aria-hidden /> طباعة
        </Button>
      </div>

      <header className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{session.store_name}</h1>
          <span className="text-muted-foreground">بوليصة شحن{gift ? " · هدية" : ""}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-2xl font-semibold">
            <Mono>#{o.id}</Mono>
          </span>
          <span className="text-muted-foreground">{formatDateTime(o.created_at)}</span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs text-muted-foreground">إلى</h2>
          <span className="text-base font-medium">{gift && o.recipient_name ? o.recipient_name : o.customer_name}</span>
          <Mono className="self-start">{prettyPhone(gift && o.recipient_phone ? o.recipient_phone : o.customer_phone)}</Mono>
          <span>{o.pickup_location ? `استلام من «${o.pickup_location.name}»` : o.address}</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xs text-muted-foreground">الشحن</h2>
          <span>{o.pickup_location ? "استلام من فرع" : (o.delivery_method_name ?? "—")}</span>
          <span>
            رقم التتبع <Mono>{o.tracking_number ?? o.public_uuid}</Mono>
          </span>
          {!gift && collect ? (
            <span className="mt-2 text-base font-semibold">
              المبلغ عند الاستلام <Money value={collect} />
            </span>
          ) : null}
        </div>
      </section>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-foreground text-start text-xs text-muted-foreground">
            <th className="py-2 text-start font-normal">المنتج</th>
            <th className="py-2 text-start font-normal">SKU</th>
            <th className="py-2 text-end font-normal">الكمية</th>
            {!gift ? <th className="py-2 text-end font-normal">المجموع</th> : null}
          </tr>
        </thead>
        <tbody>
          {o.items.map((it) => (
            <tr key={it.id} className="border-b border-border">
              <td className="py-2">
                {it.product_name}
                {it.variant_label ? <span className="text-muted-foreground"> — {it.variant_label}</span> : null}
              </td>
              <td className="py-2">
                <Mono className="text-xs">{it.sku_snapshot}</Mono>
              </td>
              <td className="py-2 text-end">
                <Mono>{formatNumber(Number(it.quantity), 3)}</Mono>
              </td>
              {!gift ? (
                <td className="py-2 text-end">
                  <Money value={it.display_line_total} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {!gift ? (
        <dl className="ms-auto flex w-64 flex-col gap-1">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الشحن</dt>
            <dd>
              <Money value={o.invoice.display_delivery_fee} />
            </dd>
          </div>
          <div className="flex justify-between border-t border-foreground pt-1 font-semibold">
            <dt>الإجمالي</dt>
            <dd>
              <Money value={o.invoice.display_total} />
            </dd>
          </div>
        </dl>
      ) : o.gift_message ? (
        <blockquote className="border-s-2 border-foreground ps-3 text-base">«{o.gift_message}»</blockquote>
      ) : null}
    </article>
  );
}
