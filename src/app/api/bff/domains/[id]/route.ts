import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { deleteDomain } from "@/mocks/integrations/domains";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";

/** `DELETE /api/v1/domains/<id>/` `[INT-023]` — the primary domain is never deleted (§8). */
async function mockDELETE(request: Request, { params }: RouteContext<"/api/bff/domains/[id]">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "النطاقات") ?? respond(deleteDomain(store, id)));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/domains/[id]">;
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/domains/${encodeURIComponent(id)}/`;
}
export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockDELETE(request, ctx));
}
