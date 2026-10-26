import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listLocationInventory } from "@/mocks/locations/inventory";

/** `GET /api/v1/locations/<id>/inventory/?q&below_reorder&page` (M22 US-22.4) — permission `inventory.view`. */
async function mockGET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/inventory">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, url }) => mockJson(listLocationInventory(store, Number(id), url.searchParams), { delay: 180 }), { permission: "inventory.view" });
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/[id]/inventory">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/${encodeURIComponent(p.id)}/inventory/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockGET(request, ctx));
}
