import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { notificationSummary } from "@/mocks/notifications/state";

/** `GET /api/v1/notifications/summary/` → `{unread_total, by_kind, has_critical}`. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => mockJson(notificationSummary(store, session), { delay: 80 }));
}
