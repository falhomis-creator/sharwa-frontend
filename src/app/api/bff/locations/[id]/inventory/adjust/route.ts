import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { adjustStock } from "@/mocks/inventory/state";

/**
 * The location's inline stock edit: the same `POST /api/v1/inventory/adjustments/` contract
 * (M21 §7) with `location_id` forced to this location (FR-22.06) — permission `inventory.adjust`.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/inventory/adjust">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => respond(adjustStock(store, { ...(await readBody(request)), location_id: Number(id) }, actorName(session)), { delay: 220 }), {
    permission: "inventory.adjust",
  });
}
