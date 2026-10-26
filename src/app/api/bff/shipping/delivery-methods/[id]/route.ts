import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteMethod, patchMethod } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `PATCH/DELETE /api/v1/shipping/delivery-methods/<id>/` — M15 §7, `live: INT-021`. */
async function mockPATCH(request: Request, ctx: RouteContext<"/api/bff/shipping/delivery-methods/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchMethod(store, Number(id), await readBody(request)), { delay: 220 }));
}

async function mockDELETE(request: Request, ctx: RouteContext<"/api/bff/shipping/delivery-methods/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? respond(deleteMethod(store, Number(id)), { delay: 180 }));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/shipping/delivery-methods/[id]">;

async function upstream(ctx: Ctx) {
  return `/api/v1/shipping/delivery-methods/${encodeURIComponent((await ctx.params).id)}/`;
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockDELETE(request, ctx));
}
