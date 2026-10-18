import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { assignments, putAssignments, sessionActor } from "@/mocks/staff/state";

/** `GET/PUT /api/v1/staff/<id>/assignments/` `[{location_id, role_id, location_role}]` (US-18.3). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/assignments">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(assignments(store, id), { delay: 120 }), { permission: "staff.view" });
}

export async function PUT(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/assignments">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => {
      const body: unknown = await request.json().catch(() => null);
      return respond(putAssignments(store, id, body, sessionActor(store, session).name));
    },
    { permission: "staff.manage_assignments" },
  );
}
