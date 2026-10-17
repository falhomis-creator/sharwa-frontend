import { Mono } from "@/components/shared/mono";
import { StatusDot } from "@/features/landing/components/status-dot";
import {
  previewData,
  previewDashboard,
  type PreviewKey,
} from "@/features/landing/landing.content";

/**
 * T036 — each bento cell carries a miniature of the REAL interface, built from
 * the same tokens as the product: hairline rules, tabular numerals, semantic
 * dots. No icons in colored circles, no stock illustration, no emoji
 * (constitution I).
 */

const Row = ({ children, last = false }: { children: React.ReactNode; last?: boolean }) => (
  <div
    className={`flex h-9 items-center gap-3 text-xs ${last ? "" : "border-b border-border/50"}`}
  >
    {children}
  </div>
);

function OrdersPreview() {
  return (
    <div className="w-full">
      <div className="flex h-7 items-center gap-3 border-b border-border/60 text-[0.65rem] text-muted-foreground">
        <span className="w-18 shrink-0">الطلب</span>
        <span className="min-w-0 flex-1">الحالة</span>
        <span className="w-16 shrink-0 text-end">الإجمالي</span>
      </div>
      {previewDashboard.orders.slice(0, 4).map((order, i, arr) => (
        <Row key={order.id} last={i === arr.length - 1}>
          <Mono className="w-18 shrink-0 text-[0.7rem] text-muted-foreground">{order.id}</Mono>
          <span className="min-w-0 flex-1">
            <StatusDot status={order.status} />
          </span>
          <span className="flex w-16 shrink-0 items-baseline justify-end gap-1">
            <Mono className="text-[0.7rem] text-foreground">{order.total}</Mono>
          </span>
        </Row>
      ))}
    </div>
  );
}

function VariantsPreview() {
  const { product, rows } = previewData.variants;
  return (
    <div className="w-full">
      <div className="pb-2 text-xs font-medium text-foreground">{product}</div>
      {rows.map((row, i, arr) => (
        <Row key={row.sku} last={i === arr.length - 1}>
          <span className="min-w-0 flex-1 truncate text-foreground">{row.variant}</span>
          <Mono className="shrink-0 text-[0.7rem] text-foreground">{row.price}</Mono>
          <Mono
            className={`w-8 shrink-0 text-end text-[0.7rem] ${row.stock === "0" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {row.stock}
          </Mono>
        </Row>
      ))}
    </div>
  );
}

function ShipmentPreview() {
  const { tracking, carrier, steps } = previewData.shipment;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between pb-3">
        <span className="text-xs text-muted-foreground">{carrier}</span>
        <Mono className="text-[0.7rem] text-foreground">{tracking}</Mono>
      </div>
      <ol className="relative">
        {steps.map((step, i) => (
          <li key={step.label} className="relative flex items-center gap-3 pb-3 last:pb-0">
            <span className="relative flex size-3 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${step.done ? "bg-foreground" : "bg-border"}`}
              />
              {i < steps.length - 1 ? (
                <span aria-hidden className="absolute top-3 h-3 w-px bg-border" />
              ) : null}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-xs ${step.done ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step.label}
            </span>
            <Mono className="shrink-0 text-[0.7rem] text-muted-foreground">{step.at}</Mono>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WalletPreview() {
  const { balance, currency, pending, rows } = previewData.wallet;
  return (
    <div className="w-full">
      <div className="flex items-baseline gap-1.5 pb-1">
        <Mono className="text-2xl font-medium tracking-tight text-foreground">{balance}</Mono>
        <span className="text-xs text-muted-foreground">{currency}</span>
      </div>
      <div className="pb-3 text-[0.7rem] text-muted-foreground">
        قيد التسوية <Mono className="text-foreground">{pending}</Mono>
      </div>
      {rows.map((row, i, arr) => (
        <Row key={row.label} last={i === arr.length - 1}>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.label}</span>
          <Mono className="shrink-0 text-[0.7rem] text-foreground">{row.amount}</Mono>
        </Row>
      ))}
    </div>
  );
}

function CouponPreview() {
  const { code, value, used, cap, expires } = previewData.coupon;
  const pct = Math.round((Number(used) / Number(cap)) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-background/60 px-3 py-2.5">
        <Mono className="text-sm font-medium tracking-wider text-foreground">{code}</Mono>
        <span className="text-sm font-medium text-foreground">{value}−</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between text-[0.7rem] text-muted-foreground">
        <span>
          استُخدمت <Mono className="text-foreground">{used}</Mono> من{" "}
          <Mono className="text-foreground">{cap}</Mono>
        </span>
        <span>حتى {expires}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PosPreview() {
  const { lines, total, currency } = previewData.pos;
  return (
    <div className="w-full">
      {lines.map((line) => (
        <Row key={line.name}>
          <Mono className="w-6 shrink-0 text-[0.7rem] text-muted-foreground">{line.qty}×</Mono>
          <span className="min-w-0 flex-1 truncate text-foreground">{line.name}</span>
          <Mono className="shrink-0 text-[0.7rem] text-foreground">{line.price}</Mono>
        </Row>
      ))}
      <div className="flex h-11 items-center justify-between">
        <span className="text-xs font-medium text-foreground">الإجمالي</span>
        <span className="flex items-baseline gap-1">
          <Mono className="text-lg font-medium tracking-tight text-foreground">{total}</Mono>
          <span className="text-[0.7rem] text-muted-foreground">{currency}</span>
        </span>
      </div>
    </div>
  );
}

function InboxPreview() {
  return (
    <div className="w-full">
      {previewData.inbox.threads.map((thread, i, arr) => (
        <div
          key={thread.name}
          className={`flex items-start gap-3 py-2.5 ${i === arr.length - 1 ? "" : "border-b border-border/50"}`}
        >
          <span
            aria-hidden
            className={`mt-1.5 size-1.5 shrink-0 rounded-full ${thread.unread ? "bg-foreground" : "bg-border"}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium text-foreground">{thread.name}</span>
              <span className="shrink-0 text-[0.65rem] text-muted-foreground">{thread.channel}</span>
            </div>
            <p className="truncate text-[0.7rem] text-muted-foreground">{thread.snippet}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const PREVIEWS: Record<PreviewKey, () => React.ReactElement> = {
  orders: OrdersPreview,
  variants: VariantsPreview,
  shipment: ShipmentPreview,
  wallet: WalletPreview,
  coupon: CouponPreview,
  pos: PosPreview,
  inbox: InboxPreview,
};
