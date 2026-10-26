import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { staffState } from "@/mocks/staff/state";

/** `GET /api/v1/staff/<id>/devices/` — `TrustedDevice` (US-18.4.3). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/devices">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).devices.filter((d) => d.staff_id === id), { delay: 100 }), { permission: "staff.view_sessions" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/devices">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/devices/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}
