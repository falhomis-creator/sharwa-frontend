import { mockRoute, respond } from "@/lib/bff/mock-route";
import { deleteOffer, getOffer, updateOffer } from "@/mocks/marketing/state";
import { readOfferBody } from "@/mocks/marketing/offer-body";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/offers/[id]">;

/** `GET|PATCH|DELETE /api/v1/promotions/offers/{id}/` `[NEEDS BACKEND]` (M13 FR-13.03). */
export async function GET(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => {
    const o = getOffer(store, id);
    return o ? mockJson(o, { delay: 100 }) : mockJson({ detail: "العرض غير موجود." }, { status: 404 });
  }, { permission: "discounts.apply" });
}
export async function PATCH(request: Request, { params }: Ctx) {
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
export async function DELETE(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(deleteOffer(store, id)), { permission: "discounts.manage" });
}
