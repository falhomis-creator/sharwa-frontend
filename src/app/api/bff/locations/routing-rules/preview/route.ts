import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { previewRouting } from "@/mocks/locations/state";

/** `GET …/routing-rules/preview/?city&category` → the location the first matching rule picks. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => {
    const category = url.searchParams.get("category");
    return mockJson(previewRouting(store, url.searchParams.get("city") ?? "", category ? Number(category) : null), { delay: 100 });
  });
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/routing-rules/preview/", () => mockGET(request));
}
