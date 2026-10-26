import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { deleteOffer, getOffer, updateOffer } from "@/mocks/marketing/state";
import { readOfferBody } from "@/mocks/marketing/offer-body";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/offers/[id]">;

/** `GET|PATCH|DELETE /api/v1/promotions/offers/{id}/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.03). */
async function mockGET(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => {
    const o = getOffer(store, id);
    return o ? mockJson(o, { delay: 100 }) : mockJson({ detail: "العرض غير موجود." }, { status: 404 });
  }, { permission: "discounts.apply" });
}
async function mockPATCH(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store }) => {
      const body = await readOfferBody(request);
      if (!body.ok) return mockJson(body.body, { status: body.status });
      return respond(updateOffer(store, id, body.data));
    },
    { permission: "discounts.manage" },
  );
}
async function mockDELETE(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(deleteOffer(store, id)), { permission: "discounts.manage" });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request, ctx: RouteContext<"/api/bff/marketing/offers/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/offers/${id}/`, () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/marketing/offers/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/offers/${id}/`, () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/marketing/offers/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/offers/${id}/`, () => mockDELETE(request, ctx));
}
