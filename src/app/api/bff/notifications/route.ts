import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listNotifications } from "@/mocks/notifications/state";

/** `GET /api/v1/notifications/?unread=1&kind&page&page_size` — trimmed by permission server-side (FR-49.02). Live: INT-009. */
export async function GET(request: Request) {
  return liveOrMock(request, "notifications", "/api/v1/notifications/", () =>
    mockRoute(request, ({ store, session, url }) => mockJson(listNotifications(store, session, url.searchParams), { delay: 160 })),
  );
}
