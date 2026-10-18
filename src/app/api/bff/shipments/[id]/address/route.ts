import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { updateShipmentAddress } from "@/mocks/shipping/ops";

/** `POST /api/v1/shipments/<id>/address/` `{address, latitude?, longitude?}` — only `in_transit`; writes a `merchant_manual` event (M15 US-15.7). */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/shipments/[id]/address">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => respond(updateShipmentAddress(store, Number(id), await readBody(request), actorName(session)), { delay: 240 }), { permission: "orders.update_status" });
}
