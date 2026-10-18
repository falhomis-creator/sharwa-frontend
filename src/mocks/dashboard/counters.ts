import type { Counters } from "@/features/dashboard-shell/schemas";
import { overviewMock } from "@/mocks/dashboard/overview";
import { orderCounters } from "@/mocks/orders/state";

/**
 * `GET /api/v1/dashboard/counters/` fixture (M03 §7 — `[NEEDS BACKEND]`).
 * Derived from the overview fixture so the sidebar badges and the attention block can
 * never disagree with each other.
 */
export function countersMock(store: string | null): Counters {
  const overview = overviewMock(store);
  const alerts = overview.attention.unread_behavior_alerts;
  return {
    // M06: the sidebar badge is the count of `status=new` orders in the order fixture.
    new_orders: orderCounters(store).new,
    unread_conversations: overview.attention.unread_conversations,
    pending_approvals: overview.attention.pending_approvals,
    unread_behavior_alerts: alerts.warning + alerts.critical,
  };
}
