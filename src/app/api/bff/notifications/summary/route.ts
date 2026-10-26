import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { notificationSummary } from "@/mocks/notifications/state";

/** `GET /api/v1/notifications/summary/` → `{unread_total, by_kind, has_critical}`. Live: INT-009. */
export async function GET(request: Request) {
  return liveOrMock(request, "notifications", "/api/v1/notifications/summary/", () =>
    mockRoute(request, ({ store, session }) => mockJson(notificationSummary(store, session), { delay: 80 })),
  );
}
