import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { createCoupon, listCoupons } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/coupons/` `[NEEDS BACKEND]` (M13 FR-13.01, FR-13.02). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listCoupons(store, url.searchParams), { delay: 150 }), { permission: "discounts.apply" });
}
export async function POST(request: Request) {
  return mockRoute(request, async ({ store }) => respond(createCoupon(store, await readBody(request))), { permission: "discounts.manage" });
}
