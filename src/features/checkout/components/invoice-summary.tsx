"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Money } from "@/components/shared/money";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/features/checkout/schemas";

/**
 * The invoice exactly as the server computed it (M12 US-12.6.1), in the documented order:
 * subtotal · discount · offers · coupon · delivery · wallet · TOTAL; for a deposit order the
 * two bold rows «المطلوب الآن» / «عند الاستلام». While a new quote is on its way the previous
 * numbers stay, dimmed (FR-12.03). Phones: a collapsible bar at the top that always shows the
 * total (M12 §6).
 */
function Row({ label, value, tone, strong }: { label: string; value: string | null | undefined; tone?: "success"; strong?: boolean }) {
  if (!value) return null;
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "text-base font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className={cn("text-end", tone === "success" && "text-success")}>
        {tone === "success" ? "− " : null}
        <Money value={value} />
      </dd>
    </div>
  );
}

export function InvoiceLines({ invoice, recomputing }: { invoice: Invoice; recomputing: boolean }) {
  return (
    <dl className={cn("space-y-2 text-sm transition-opacity", recomputing && "opacity-50")} aria-busy={recomputing} data-testid="invoice">
      <Row label="المجموع الفرعي" value={invoice.display_subtotal} />
      {invoice.applied_offers.map((o) => (
        <Row key={o.name} label={`عرض: ${o.name}`} value={o.display_discount} tone="success" />
      ))}
      {invoice.coupon_code ? <Row label={`الكوبون ${invoice.coupon_code}`} value={invoice.display_discount} tone="success" /> : <Row label="الخصم" value={invoice.display_discount} tone="success" />}
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted-foreground">التوصيل</dt>
        <dd className={invoice.free_shipping_applies ? "text-success" : undefined}>
          {invoice.free_shipping_applies ? "مجاني" : <Money value={invoice.display_delivery_fee} />}
        </dd>
      </div>
      <Row label="نقاط الولاء" value={invoice.display_loyalty_discount} tone="success" />
      <Row label="من المحفظة" value={invoice.display_wallet_amount_used} tone="success" />
      <div className="border-t border-border pt-2">
        <Row label="الإجمالي" value={invoice.display_total} strong />
      </div>
      {invoice.display_upfront_required ? (
        <div className="store-frame space-y-1.5 rounded-lg border-border p-3">
          <Row label="المطلوب الآن (العربون)" value={invoice.display_upfront_required} strong />
          <Row label="عند الاستلام" value={invoice.display_amount_on_delivery} strong />
        </div>
      ) : null}
      {invoice.fully_paid_by_wallet ? <p className="text-sm text-success">مدفوع بالكامل من المحفظة.</p> : null}
    </dl>
  );
}

export function MobileInvoiceBar({ invoice, recomputing, children }: { invoice: Invoice | undefined; recomputing: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="store-frame rounded-lg border-border md:hidden" data-testid="invoice-mobile">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          ملخص الطلب
          <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
        <span>
          الإجمالي <Money value={invoice?.display_total} className={cn("font-semibold", recomputing && "opacity-50")} />
        </span>
      </button>
      {open && invoice ? (
        <div className="space-y-4 border-t border-border p-4">
          {children}
          <InvoiceLines invoice={invoice} recomputing={recomputing} />
        </div>
      ) : null}
    </div>
  );
}
