import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { getCart } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/promotions/abandoned-carts/{id}/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.04). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/marketing/abandoned-carts/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "السلات المتروكة مقصورة على مالك المتجر." }, { status: 403 });
    const c = getCart(store, id);
    return c ? mockJson(c, { delay: 100 }) : mockJson({ detail: "السلة غير موجودة." }, { status: 404 });
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request, ctx: RouteContext<"/api/bff/marketing/abandoned-carts/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/abandoned-carts/${id}/`, () => mockGET(request, ctx));
}
