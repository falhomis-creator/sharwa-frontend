import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listOrderRefunds } from "@/mocks/returns/state";

/** `GET /api/v1/orders/refunds/?method&from&to&q&page` — M24 §7 live: INT-026. Read-only. */
async function mockGET(request: Request) {
  return mockRoute(
    request,
    ({ store, url, session }) =>
      session.features.includes("refunds") ? mockJson(listOrderRefunds(store, url.searchParams), { delay: 160 }) : mockJson({ detail: "ميزة المرتجعات غير مفعّلة في خطتك." }, { status: 403 }),
    { permission: "orders.refund" },
  );
}

// INT-026: `liveOrMock` module `returns` → Django `api/views_returns.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "returns", "/api/v1/orders/refunds/", () => mockGET(request));
}
