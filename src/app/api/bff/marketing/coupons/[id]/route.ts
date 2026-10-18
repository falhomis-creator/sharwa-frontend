import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteCoupon, getCoupon, updateCoupon } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/coupons/[id]">;

/** `GET|PATCH|DELETE /api/v1/promotions/coupons/{id}/` `[NEEDS BACKEND]` (M13 FR-13.02). */
export async function GET(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => {
    const c = getCoupon(store, id);
    return c ? mockJson(c, { delay: 100 }) : mockJson({ detail: "الكوبون غير موجود." }, { status: 404 });
  }, { permission: "discounts.apply" });
}
export async function PATCH(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store }) => respond(updateCoupon(store, id, await readBody(request))), { permission: "discounts.manage" });
}
export async function DELETE(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(deleteCoupon(store, id)), { permission: "discounts.manage" });
}
