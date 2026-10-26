import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { updateShipmentAddress } from "@/mocks/shipping/ops";

/** `POST /api/v1/shipments/<id>/address/` `{address, latitude?, longitude?}` — only `in_transit`; writes a `merchant_manual` event (M15 US-15.7). */
async function mockPOST(request: Request, ctx: RouteContext<"/api/bff/shipments/[id]/address">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => respond(updateShipmentAddress(store, Number(id), await readBody(request), actorName(session)), { delay: 240 }), { permission: "orders.update_status" });
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/shipments/[id]/address">;

async function upstream(ctx: Ctx) {
  return `/api/v1/shipments/${encodeURIComponent((await ctx.params).id)}/address/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockPOST(request, ctx));
}
