import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { addOverride, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET/POST /api/v1/staff/<id>/overrides/` `{permission_code, allow}` (US-18.3.2). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/overrides">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).overrides.filter((o) => o.staff_id === id), { delay: 100 }), { permission: "staff.view" });
}

export async function POST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/overrides">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => respond(addOverride(store, id, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage_assignments",
  });
}
