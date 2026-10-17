import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/features/landing/landing.content";

/**
 * Status = a 6px semantic dot plus text. Never a filled colored pill
 * (constitution I: semantic color for data state only, never for surfaces).
 */
const DOT: Record<OrderStatus, string> = {
  paid: "bg-success",
  processing: "bg-info",
  shipped: "bg-foreground",
  pending: "bg-warning",
  cancelled: "bg-destructive",
};

export function StatusDot({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[status])} />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
