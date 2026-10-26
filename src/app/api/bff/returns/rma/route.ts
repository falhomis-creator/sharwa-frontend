import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listRmas } from "@/mocks/returns/state";

/** `GET /api/v1/returns/rma/?status&q&page` — M24 §7 live: INT-026. */
async function mockGET(request: Request) {
  return mockRoute(
    request,
    ({ store, url, session }) =>
      session.features.includes("refunds") ? mockJson(listRmas(store, url.searchParams), { delay: 160 }) : mockJson({ detail: "ميزة المرتجعات غير مفعّلة في خطتك." }, { status: 403 }),
    { permission: "orders.process_returns" },
  );
}

// INT-026: `liveOrMock` module `returns` → Django `api/views_returns.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "returns", "/api/v1/returns/rma/", () => mockGET(request));
}
