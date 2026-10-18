import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { pendingApprovalsCount } from "@/mocks/approvals/state";
import { unreadAlertsCount } from "@/mocks/staff/state";

/** `GET /api/v1/staff/counters/` → `{pending_approvals, unread_alerts}` (FR-18.10, refreshed every 60s). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson({ pending_approvals: pendingApprovalsCount(store), unread_alerts: unreadAlertsCount(store) }, { delay: 80 }), {
    permission: "staff.view",
  });
}
