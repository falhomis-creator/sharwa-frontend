import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { testEndpoint } from "@/mocks/integrations/webhooks";

/** `POST /api/v1/webhooks/endpoints/<id>/test/` `[INT-023]` — «إرسال حدث تجريبي» (US-19.3.4). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/webhooks/endpoints/[id]/test">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(testEndpoint(store, id), { delay: 400 }));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/webhooks/endpoints/[id]/test">;
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/webhooks/endpoints/${encodeURIComponent(id)}/test/`;
}
export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockPOST(request, ctx));
}
