import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { listDeliveries } from "@/mocks/integrations/webhooks";

/** `GET /api/v1/webhooks/endpoints/<id>/deliveries/?status&event&from&to&page` `[INT-023]` (FR-19.07). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/webhooks/endpoints/[id]/deliveries">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session, "الـ Webhooks") ?? respond(listDeliveries(store, id, url.searchParams), { delay: 150 }));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/webhooks/endpoints/[id]/deliveries">;
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/webhooks/endpoints/${encodeURIComponent(id)}/deliveries/`;
}
export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockGET(request, ctx));
}
