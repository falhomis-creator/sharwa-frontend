import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createLocation, listLocations } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `GET /api/v1/locations/?q&flag&ownership&is_active` · `POST /api/v1/locations/` — M22 §7, `[NEEDS BACKEND]`. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listLocations(store, url.searchParams), { delay: 160 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createLocation(store, await readBody(request)), { delay: 240 }));
}
