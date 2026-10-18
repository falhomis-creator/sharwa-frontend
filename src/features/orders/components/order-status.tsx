import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/features/orders/schemas";
import type { FulfillmentRef } from "@/features/orders/schemas";

/**
 * The two status axes, ALWAYS rendered apart (FR-06.03, SC-06.2):
 * - financial `status` → a zinc text badge (1px border, semantic TEXT colour, no fill);
 * - fulfilment → a 6px dot in the merchant's own `OrderStatus.color` + its name.
 */
const TONE: Record<(typeof ORDER_STATUS_TONE)[OrderStatus], string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

export function FinancialStatus({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center whitespace-nowrap rounded border border-border px-1.5 text-xs", TONE[ORDER_STATUS_TONE[status]], className)}
      data-testid="financial-status"
      data-status={status}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function FulfillmentDot({ status, className }: { status: FulfillmentRef | null; className?: string }) {
  if (!status) {
    return (
      <span className={cn("text-muted-foreground", className)} title="بلا حالة تنفيذ — يُقترح الافتراضي">
        —
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)} data-testid="fulfillment-status" data-status-name={status.name}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
      {status.name}
    </span>
  );
}

const PAY_TONE: Record<PaymentStatus, string> = {
  unpaid: "text-muted-foreground",
  pending: "text-warning",
  partial: "text-warning",
  paid: "text-success",
  failed: "text-destructive",
  indeterminate: "text-muted-foreground",
};

export function PaymentStatusText({ status, className }: { status: PaymentStatus; className?: string }) {
  return <span className={cn("whitespace-nowrap text-sm", PAY_TONE[status], className)}>{PAYMENT_STATUS_LABELS[status]}</span>;
}
