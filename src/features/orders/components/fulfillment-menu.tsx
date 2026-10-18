"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OrderListItem, OrderStatusDef } from "@/features/orders/schemas";
import { FulfillmentDot } from "@/features/orders/components/order-status";

/**
 * Change the merchant fulfilment status (US-06.3, FR-06.07). Blocked targets stay VISIBLE,
 * disabled, with the reason under their name — never hidden. The whole control is read-only
 * without `orders.update_status`, for marketplace orders (`locked_reason`) and refunds.
 */
type OrderLike = Pick<OrderListItem, "id" | "status" | "fulfillment_status" | "locked_reason">;

export function menuBlockedReason(order: OrderLike, canEdit: boolean): string | null {
  if (!canEdit) return "ليست لديك صلاحية تغيير حالة الطلب.";
  if (order.locked_reason) return order.locked_reason;
  if (order.status === "refunded") return "طلب مسترد: لا تتغيّر حالته.";
  return null;
}

export function targetBlockedReason(order: OrderLike, target: OrderStatusDef): string | null {
  if (order.fulfillment_status?.id === target.id) return "الحالة الحالية";
  if (order.status === "cancelled" && !target.releases_stock) return "طلب ملغي: أعِد تفعيله من الحالة المالية أولاً.";
  if (order.status === "completed" && target.releases_stock) return "لا يُلغى طلب مكتمل؛ استخدم مسار الاسترجاع.";
  if (order.status === "completed" && target.marks_completed) return "الطلب مكتمل بالفعل.";
  return null;
}

export function FulfillmentMenu({
  order,
  statuses,
  canEdit,
  onSelect,
  open,
  onOpenChange,
  className,
}: {
  order: OrderLike;
  statuses: OrderStatusDef[];
  canEdit: boolean;
  onSelect: (target: OrderStatusDef) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const blocked = menuBlockedReason(order, canEdit);
  if (blocked) {
    return (
      <span className={cn("inline-flex min-h-8 items-center", className)} title={blocked} data-testid={`fulfillment-readonly-${order.id}`}>
        <FulfillmentDot status={order.fulfillment_status} />
      </span>
    );
  }
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:min-h-8",
          className,
        )}
        aria-label={`حالة التنفيذ للطلب ${order.id}: ${order.fulfillment_status?.name ?? "بلا حالة"} — تغيير`}
        data-testid={`fulfillment-trigger-${order.id}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <FulfillmentDot status={order.fulfillment_status} />
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>حالة التنفيذ</DropdownMenuLabel>
          {statuses.map((s) => {
            const reason = targetBlockedReason(order, s);
            return (
              <DropdownMenuItem
                key={s.id}
                disabled={reason !== null}
                onClick={() => onSelect(s)}
                className="flex-col items-start gap-0.5"
                data-testid={`fulfillment-option-${s.id}`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {s.marks_completed ? <span className="text-[11px] text-muted-foreground">· تُكمِل الطلب</span> : null}
                  {s.releases_stock ? <span className="text-[11px] text-muted-foreground">· تُعيد المخزون</span> : null}
                </span>
                {reason && reason !== "الحالة الحالية" ? <span className="ps-3.5 text-[11px] text-muted-foreground">{reason}</span> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
