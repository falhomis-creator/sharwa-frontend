import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { createCoupon, listCoupons } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/coupons/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.01, FR-13.02). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listCoupons(store, url.searchParams), { delay: 150 }), { permission: "discounts.apply" });
}
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store }) => respond(createCoupon(store, await readBody(request))), { permission: "discounts.manage" });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/coupons/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/coupons/", () => mockPOST(request));
}
