import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { listCarts } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/promotions/abandoned-carts/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.04) — owner only. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "السلات المتروكة مقصورة على مالك المتجر." }, { status: 403 });
    return mockJson(listCarts(store, url.searchParams), { delay: 150 });
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/abandoned-carts/", () => mockGET(request));
}
