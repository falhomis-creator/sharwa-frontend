import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { endSession, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET /api/v1/staff/<id>/sessions/` · `DELETE` (all) — `staff.view_sessions` (US-18.4.1). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/sessions">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).sessions.filter((s) => s.staff_id === id), { delay: 100 }), { permission: "staff.view_sessions" });
}

async function mockDELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/sessions">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(endSession(store, id, null, sessionActor(store, session).name)), { permission: "staff.view_sessions" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/sessions">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/sessions/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockDELETE(request, ctx));
}
