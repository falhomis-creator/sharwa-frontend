import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { convertToPickup } from "@/mocks/shipping/ops";

/** `POST /api/v1/orders/<id>/convert-to-pickup/` `{pickup_location_id, version}` → 200 / 409 (stale) / 400 (after `picked_up`). */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/orders/[id]/convert-to-pickup">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store }) => respond(convertToPickup(store, Number(id), await readBody(request)), { delay: 240 }), { permission: "orders.update_status" });
}
