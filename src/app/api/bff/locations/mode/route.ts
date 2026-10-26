import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { setLocationsMode } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `POST /api/v1/locations/mode/` `{enabled, merge?}` → `{multi_location_enabled}` (409 with conflicts when stock is spread). */
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, storeHost, session }) => ownerOnly(session) ?? respond(setLocationsMode(store, storeHost, await readBody(request)), { delay: 260 }));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
export async function POST(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/mode/", () => mockPOST(request));
}
