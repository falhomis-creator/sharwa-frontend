import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { orderCounters } from "@/mocks/orders/state";

/** `GET /api/v1/orders/counters/` — the text number strip and the «جديد» badge (FR-06.12). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(orderCounters(store), { delay: 100 }), { permission: "orders.view" });
}
