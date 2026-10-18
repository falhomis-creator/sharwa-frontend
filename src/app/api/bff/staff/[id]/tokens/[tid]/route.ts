import { mockRoute, respond } from "@/lib/bff/mock-route";
import { revokeToken, sessionActor } from "@/mocks/staff/state";

/** `DELETE /api/v1/staff/<id>/tokens/<tid>/`. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/tokens/[tid]">) {
  const { id, tid } = await params;
  return mockRoute(request, ({ store, session }) => respond(revokeToken(store, Number(id), Number(tid), sessionActor(store, session).name)), { permission: "staff.manage" });
}
