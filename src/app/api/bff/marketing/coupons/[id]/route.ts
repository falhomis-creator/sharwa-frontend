import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteCoupon, getCoupon, updateCoupon } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/coupons/[id]">;

/** `GET|PATCH|DELETE /api/v1/promotions/coupons/{id}/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.02). */
async function mockGET(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => {
    const c = getCoupon(store, id);
    return c ? mockJson(c, { delay: 100 }) : mockJson({ detail: "الكوبون غير موجود." }, { status: 404 });
  }, { permission: "discounts.apply" });
}
async function mockPATCH(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store }) => respond(updateCoupon(store, id, await readBody(request))), { permission: "discounts.manage" });
}
async function mockDELETE(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(deleteCoupon(store, id)), { permission: "discounts.manage" });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request, ctx: RouteContext<"/api/bff/marketing/coupons/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/coupons/${id}/`, () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/marketing/coupons/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/coupons/${id}/`, () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/marketing/coupons/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/coupons/${id}/`, () => mockDELETE(request, ctx));
}
