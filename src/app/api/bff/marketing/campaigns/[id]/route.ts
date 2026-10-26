import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { getCampaign, updateCampaign } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/campaigns/[id]">;

/** `GET|PATCH /api/v1/promotions/campaigns/{id}/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.05). PATCH `{status:"draft"}` cancels a schedule. */
async function mockGET(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    const c = getCampaign(store, id);
    return c ? mockJson(c, { delay: 100 }) : mockJson({ detail: "الحملة غير موجودة." }, { status: 404 });
  });
}
async function mockPATCH(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    return respond(updateCampaign(store, id, await readBody(request)));
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request, ctx: RouteContext<"/api/bff/marketing/campaigns/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/campaigns/${id}/`, () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/marketing/campaigns/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/campaigns/${id}/`, () => mockPATCH(request, ctx));
}
