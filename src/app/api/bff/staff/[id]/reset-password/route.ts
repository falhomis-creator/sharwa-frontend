import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { resetStaffPassword, sessionActor } from "@/mocks/staff/state";

type Ctx = RouteContext<"/api/bff/staff/[id]/reset-password">;

/** `POST /api/v1/staff/<id>/reset-password/` → `{temporary_password, token_version}` — shown once; every session ends (INT-022). */
async function mockPOST(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(resetStaffPassword(store, id, sessionActor(store, session).name), { delay: 240 }), { permission: "staff.manage" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handler above otherwise.
export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", `/api/v1/staff/${encodeURIComponent((await ctx.params).id)}/reset-password/`, () => mockPOST(request, ctx));
}
