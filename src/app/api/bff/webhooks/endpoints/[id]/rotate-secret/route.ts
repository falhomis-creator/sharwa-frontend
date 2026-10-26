import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { rotateSecret } from "@/mocks/integrations/webhooks";

/** `POST /api/v1/webhooks/endpoints/<id>/rotate-secret/` `[INT-023]` — the new secret once (§8). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/webhooks/endpoints/[id]/rotate-secret">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(rotateSecret(store, id)));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/webhooks/endpoints/[id]/rotate-secret">;
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/webhooks/endpoints/${encodeURIComponent(id)}/rotate-secret/`;
}
export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockPOST(request, ctx));
}
