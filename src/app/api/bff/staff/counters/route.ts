import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { pendingApprovalsCount } from "@/mocks/approvals/state";
import { unreadAlertsCount } from "@/mocks/staff/state";

/** `GET /api/v1/staff/counters/` → `{pending_approvals, unread_alerts}` (FR-18.10, refreshed every 60s). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson({ pending_approvals: pendingApprovalsCount(store), unread_alerts: unreadAlertsCount(store) }, { delay: 80 }), {
    permission: "staff.view",
  });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/staff/counters/", () => mockGET(request));
}
