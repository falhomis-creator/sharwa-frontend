import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { roleView, saveRole, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET/POST /api/v1/roles/` `{name, max_discount_percent, permission_codes[]}` (US-18.2). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(staffState(store).roles.map((r) => roleView(store, r)), { delay: 120 }), { permission: "staff.view" });
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => respond(saveRole(store, null, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage_roles",
  });
}
