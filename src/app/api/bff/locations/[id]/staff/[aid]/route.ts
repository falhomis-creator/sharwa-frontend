import { mockRoute, respond } from "@/lib/bff/mock-route";
import { removeAssignment } from "@/mocks/locations/state";

/** `DELETE /api/v1/locations/<id>/staff/<assignment_id>/`. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/staff/[aid]">) {
  const { id, aid } = await ctx.params;
  return mockRoute(request, ({ store }) => respond(removeAssignment(store, Number(id), Number(aid))), { permission: "staff.manage_assignments" });
}
