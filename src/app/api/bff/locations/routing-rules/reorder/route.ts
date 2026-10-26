import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { reorderRules } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `POST /api/v1/locations/routing-rules/reorder/` `{ordered_ids:[int]}` → `{ok, reordered}` — the server renumbers `priority`. */
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(reorderRules(store, (await readBody(request)).ordered_ids), { delay: 180 }));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
export async function POST(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/routing-rules/reorder/", () => mockPOST(request));
}
