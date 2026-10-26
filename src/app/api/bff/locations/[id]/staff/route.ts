import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { addAssignment, getLocation, listAssignments } from "@/mocks/locations/state";

/** `GET/POST /api/v1/locations/<id>/staff/` `{staff_id, role}` (US-22.5) — writes need `staff.manage_assignments`. */
async function mockGET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/staff">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store }) => (getLocation(store, Number(id)) ? mockJson(listAssignments(store, Number(id)), { delay: 140 }) : mockJson({ detail: "الموقع غير موجود." }, { status: 404 })));
}

async function mockPOST(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/staff">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store }) => respond(addAssignment(store, Number(id), await readBody(request)), { delay: 200 }), { permission: "staff.manage_assignments" });
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/[id]/staff">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/${encodeURIComponent(p.id)}/staff/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockGET(request, ctx));
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockPOST(request, ctx));
}
