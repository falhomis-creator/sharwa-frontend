import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createToken, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET/POST /api/v1/staff/<id>/tokens/` — the value is returned ONCE on create (FR-18.07). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/tokens">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).tokens.filter((t) => t.staff_id === id), { delay: 100 }), { permission: "staff.view_sessions" });
}

export async function POST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/tokens">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => respond(createToken(store, id, await readBody(request), sessionActor(store, session).name)), { permission: "staff.manage" });
}
