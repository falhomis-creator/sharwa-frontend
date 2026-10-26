import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { removeOverride, sessionActor } from "@/mocks/staff/state";

/** `DELETE /api/v1/staff/<id>/overrides/<oid>/`. */
async function mockDELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/overrides/[oid]">) {
  const { id, oid } = await params;
  return mockRoute(request, ({ store, session }) => respond(removeOverride(store, Number(id), Number(oid), sessionActor(store, session).name)), {
    permission: "staff.manage_assignments",
  });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/overrides/[oid]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/overrides/${encodeURIComponent(p.oid)}/`;
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockDELETE(request, ctx));
}
