import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { endSession, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET /api/v1/staff/<id>/sessions/` · `DELETE` (all) — `staff.view_sessions` (US-18.4.1). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/sessions">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).sessions.filter((s) => s.staff_id === id), { delay: 100 }), { permission: "staff.view_sessions" });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/sessions">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(endSession(store, id, null, sessionActor(store, session).name)), { permission: "staff.view_sessions" });
}
