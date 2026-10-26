import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { removeAssignment } from "@/mocks/locations/state";

/** `DELETE /api/v1/locations/<id>/staff/<assignment_id>/`. */
async function mockDELETE(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/staff/[aid]">) {
  const { id, aid } = await ctx.params;
  return mockRoute(request, ({ store }) => respond(removeAssignment(store, Number(id), Number(aid))), { permission: "staff.manage_assignments" });
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/[id]/staff/[aid]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/${encodeURIComponent(p.id)}/staff/${encodeURIComponent(p.aid)}/`;
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockDELETE(request, ctx));
}
