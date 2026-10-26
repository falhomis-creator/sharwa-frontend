import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { redeliver } from "@/mocks/integrations/webhooks";

/** `POST /api/v1/webhooks/deliveries/<id>/redeliver/` `[INT-023]` — failed only (SC-19.5). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/webhooks/deliveries/[id]/redeliver">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(redeliver(store, id), { delay: 300 }));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/webhooks/deliveries/[id]/redeliver">;
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/webhooks/deliveries/${encodeURIComponent(id)}/redeliver/`;
}
export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockPOST(request, ctx));
}
