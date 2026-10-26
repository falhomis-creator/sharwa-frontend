import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createLocation, listLocations } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `GET /api/v1/locations/?q&flag&ownership&is_active` · `POST /api/v1/locations/` — M22 §7, live: INT-025. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listLocations(store, url.searchParams), { delay: 160 }));
}

async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createLocation(store, await readBody(request)), { delay: 240 }));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/", () => mockPOST(request));
}
