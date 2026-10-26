import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { sessionActor, terminateStaff } from "@/mocks/staff/state";

/** `POST /api/v1/staff/<id>/terminate/` — soft (`terminated_at`), sessions revoked (FR-18.02). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/terminate">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(terminateStaff(store, id, sessionActor(store, session).name), { delay: 260 }), { permission: "staff.manage" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/terminate">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/terminate/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPOST(request, ctx));
}
