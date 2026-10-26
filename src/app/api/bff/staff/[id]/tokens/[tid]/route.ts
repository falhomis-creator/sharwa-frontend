import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { revokeToken, sessionActor } from "@/mocks/staff/state";

/** `DELETE /api/v1/staff/<id>/tokens/<tid>/`. */
async function mockDELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/tokens/[tid]">) {
  const { id, tid } = await params;
  return mockRoute(request, ({ store, session }) => respond(revokeToken(store, Number(id), Number(tid), sessionActor(store, session).name)), { permission: "staff.manage" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/tokens/[tid]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/tokens/${encodeURIComponent(p.tid)}/`;
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockDELETE(request, ctx));
}
