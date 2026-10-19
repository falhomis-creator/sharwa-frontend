import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Receipt } from "@/features/pos/schemas";

/**
 * The POS receipt (M16 US-16.2.3, FR-16.07): every amount is the server's `display_*`
 * text; numbers, SKUs and the receipt number are Mono. Prints as a narrow 80mm-ish sheet.
 */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <article className="mx-auto flex w-full max-w-sm flex-col gap-3 text-sm" data-testid="pos-receipt">
      <header className="flex flex-col items-center gap-0.5 border-b border-dashed border-border pb-3 text-center">
        <p className="text-base font-semibold">{receipt.store_name}</p>
        <p className="text-xs text-muted-foreground">
          {receipt.location_name} · {receipt.register_name}
        </p>
        <p className="text-xs text-muted-foreground">
          إيصال <Mono data-testid="pos-receipt-number">{receipt.number}</Mono> · <Mono>{formatDate(receipt.created_at, { dateStyle: "short", timeStyle: "short" })}</Mono>
        </p>
        <p className="text-xs text-muted-foreground">الكاشير: {receipt.cashier}</p>
      </header>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((l, i) => (
            <tr key={`${l.sku}-${i}`} className="align-top">
              <td className="py-1 pe-2">
                <span className="block">{l.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {l.variant_label ? `${l.variant_label} · ` : ""}
                  <Mono>{l.sku}</Mono>
                  {l.discount_percent ? (
                    <>
                      {" "}
                      · خصم <Mono>{l.discount_percent}%</Mono>
                    </>
                  ) : null}
                </span>
              </td>
              <td className="py-1 text-end whitespace-nowrap">
                <Mono>
                  {l.quantity} × {l.display_unit_price}
                </Mono>
              </td>
              <td className="py-1 ps-2 text-end whitespace-nowrap">
                <Money value={l.display_line_total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="flex flex-col gap-1 border-t border-dashed border-border pt-3">
        <Row label="المجموع">
          <Money value={receipt.display_subtotal} />
        </Row>
        {receipt.display_discount ? (
          <Row label="الخصم">
            <Money value={receipt.display_discount} />
          </Row>
        ) : null}
        <Row label="الإجمالي" strong>
          <Money value={receipt.display_total} className="text-lg font-semibold" />
        </Row>
        <Row label="طريقة الدفع">{PAYMENT_METHOD_LABELS[receipt.payment_method]}</Row>
        {receipt.display_refunded ? (
          <Row label="المُسترد">
            <Money value={receipt.display_refunded} />
          </Row>
        ) : null}
      </dl>
      <p className="border-t border-dashed border-border pt-3 text-center text-xs text-muted-foreground">شكراً لتسوقكم</p>
    </article>
  );
}

function Row({ label, strong = false, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}
