import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { marketingSummary } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/bff/marketing/summary` — the hub's number strip (Django `api/views_marketing.py` since INT-019) (M13 US-13.1). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(marketingSummary(store), { delay: 100 }), { permission: "discounts.apply" });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/summary/", () => mockGET(request));
}
