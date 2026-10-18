import { mockRoute, respond } from "@/lib/bff/mock-route";
import { endSession, sessionActor } from "@/mocks/staff/state";

/** `DELETE /api/v1/staff/<id>/sessions/<sid>/`. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/sessions/[sid]">) {
  const { id, sid } = await params;
  return mockRoute(request, ({ store, session }) => respond(endSession(store, Number(id), Number(sid), sessionActor(store, session).name)), {
    permission: "staff.view_sessions",
  });
}
