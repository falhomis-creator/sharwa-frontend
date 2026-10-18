import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listLocationInventory } from "@/mocks/locations/inventory";

/** `GET /api/v1/locations/<id>/inventory/?q&below_reorder&page` (M22 US-22.4) — permission `inventory.view`. */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/inventory">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, url }) => mockJson(listLocationInventory(store, Number(id), url.searchParams), { delay: 180 }), { permission: "inventory.view" });
}
