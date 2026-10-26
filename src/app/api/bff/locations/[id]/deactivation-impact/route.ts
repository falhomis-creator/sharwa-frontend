import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { deactivationImpact, getLocation } from "@/mocks/locations/state";

/** `GET /api/v1/locations/<id>/deactivation-impact/` → `{on_hand_total, open_fulfillments}` (FR-22.08). */
async function mockGET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/deactivation-impact">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store }) => (getLocation(store, Number(id)) ? mockJson(deactivationImpact(store, Number(id)), { delay: 120 }) : mockJson({ detail: "الموقع غير موجود." }, { status: 404 })));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/[id]/deactivation-impact">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/${encodeURIComponent(p.id)}/deactivation-impact/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockGET(request, ctx));
}
