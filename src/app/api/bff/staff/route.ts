import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createStaff, listStaff, sessionActor } from "@/mocks/staff/state";

/** `GET /api/v1/staff/?status&q&page` · `POST /api/v1/staff/` (M18 §7, `[NEEDS BACKEND]`). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listStaff(store, url.searchParams), { delay: 200 }), { permission: "staff.view" });
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => respond(createStaff(store, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage",
  });
}
