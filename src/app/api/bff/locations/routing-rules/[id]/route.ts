import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteRule, patchRule } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

async function mockPATCH(request: Request, ctx: RouteContext<"/api/bff/locations/routing-rules/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchRule(store, Number(id), await readBody(request)), { delay: 200 }));
}

async function mockDELETE(request: Request, ctx: RouteContext<"/api/bff/locations/routing-rules/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? respond(deleteRule(store, Number(id))));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/routing-rules/[id]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/routing-rules/${encodeURIComponent(p.id)}/`;
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockDELETE(request, ctx));
}
