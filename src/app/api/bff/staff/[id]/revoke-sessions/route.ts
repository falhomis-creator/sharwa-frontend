import { mockRoute, respond } from "@/lib/bff/mock-route";
import { revokeSessions, sessionActor } from "@/mocks/staff/state";

/** `POST /api/v1/staff/<id>/revoke-sessions/` — raises `token_version` (US-18.1.3). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/revoke-sessions">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(revokeSessions(store, id, sessionActor(store, session).name)), { permission: "staff.manage" });
}
