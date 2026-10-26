import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { roleView, saveRole, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET/POST /api/v1/roles/` `{name, max_discount_percent, permission_codes[]}` (US-18.2). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(staffState(store).roles.map((r) => roleView(store, r)), { delay: 120 }), { permission: "staff.view" });
}

async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => respond(saveRole(store, null, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage_roles",
  });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/roles/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/roles/", () => mockPOST(request));
}
