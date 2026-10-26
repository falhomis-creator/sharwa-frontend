import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { remindCart } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `POST /api/v1/promotions/abandoned-carts/{id}/remind/` (Django `api/views_marketing.py` since INT-019) (M13 US-13.3.1). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/marketing/abandoned-carts/[id]/remind">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "السلات المتروكة مقصورة على مالك المتجر." }, { status: 403 });
    return respond(remindCart(store, id));
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function POST(request: Request, ctx: RouteContext<"/api/bff/marketing/abandoned-carts/[id]/remind">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/abandoned-carts/${id}/remind/`, () => mockPOST(request, ctx));
}
