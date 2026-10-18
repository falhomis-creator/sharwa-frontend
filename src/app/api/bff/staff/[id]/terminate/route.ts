import { mockRoute, respond } from "@/lib/bff/mock-route";
import { sessionActor, terminateStaff } from "@/mocks/staff/state";

/** `POST /api/v1/staff/<id>/terminate/` — soft (`terminated_at`), sessions revoked (FR-18.02). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/terminate">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(terminateStaff(store, id, sessionActor(store, session).name), { delay: 260 }), { permission: "staff.manage" });
}
