import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { convertToPickup } from "@/mocks/shipping/ops";

/** `POST /api/v1/orders/<id>/convert-to-pickup/` `{pickup_location_id, version}` → 200 / 409 (stale) / 400 (after `picked_up`). */
async function mockPOST(request: Request, ctx: RouteContext<"/api/bff/orders/[id]/convert-to-pickup">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store }) => respond(convertToPickup(store, Number(id), await readBody(request)), { delay: 240 }), { permission: "orders.update_status" });
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/orders/[id]/convert-to-pickup">;

async function upstream(ctx: Ctx) {
  return `/api/v1/orders/${encodeURIComponent((await ctx.params).id)}/convert-to-pickup/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockPOST(request, ctx));
}
