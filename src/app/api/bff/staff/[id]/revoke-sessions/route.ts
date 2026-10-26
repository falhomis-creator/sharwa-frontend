import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { revokeSessions, sessionActor } from "@/mocks/staff/state";

/** `POST /api/v1/staff/<id>/revoke-sessions/` — raises `token_version` (US-18.1.3). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/revoke-sessions">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(revokeSessions(store, id, sessionActor(store, session).name)), { permission: "staff.manage" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/revoke-sessions">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/revoke-sessions/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPOST(request, ctx));
}
