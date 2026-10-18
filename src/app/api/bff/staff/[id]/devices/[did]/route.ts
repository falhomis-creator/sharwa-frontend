import { mockRoute, respond } from "@/lib/bff/mock-route";
import { removeDevice } from "@/mocks/staff/state";

/** `DELETE /api/v1/staff/<id>/devices/<did>/`. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/devices/[did]">) {
  const { id, did } = await params;
  return mockRoute(request, ({ store }) => respond(removeDevice(store, Number(id), Number(did))), { permission: "staff.manage" });
}
