import { mockRoute, respond } from "@/lib/bff/mock-route";
import { removeOverride, sessionActor } from "@/mocks/staff/state";

/** `DELETE /api/v1/staff/<id>/overrides/<oid>/`. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/overrides/[oid]">) {
  const { id, oid } = await params;
  return mockRoute(request, ({ store, session }) => respond(removeOverride(store, Number(id), Number(oid), sessionActor(store, session).name)), {
    permission: "staff.manage_assignments",
  });
}
