import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createStaff, listStaff, sessionActor } from "@/mocks/staff/state";

/** `GET /api/v1/staff/?status&q&page` · `POST /api/v1/staff/` (M18 §7, live: INT-022). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listStaff(store, url.searchParams), { delay: 200 }), { permission: "staff.view" });
}

async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => respond(createStaff(store, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage",
  });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/staff/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/staff/", () => mockPOST(request));
}
