import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { orderCounters } from "@/mocks/orders/state";

/** `GET /api/v1/orders/counters/` — the text number strip and the «جديد» badge (FR-06.12). Live: INT-007. */
export async function GET(request: Request) {
  return liveOrMock(request, "orders", "/api/v1/orders/counters/", () =>
    mockRoute(request, ({ store }) => mockJson(orderCounters(store), { delay: 100 }), { permission: "orders.view" }),
  );
}
