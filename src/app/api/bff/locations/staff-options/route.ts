import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { STAFF_OPTIONS } from "@/mocks/locations/state";

/** The staff picker for assignments (M18's list, read-only here). */
async function mockGET(request: Request) {
  return mockRoute(request, () => mockJson(STAFF_OPTIONS, { delay: 100 }));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/staff-options/", () => mockGET(request));
}
