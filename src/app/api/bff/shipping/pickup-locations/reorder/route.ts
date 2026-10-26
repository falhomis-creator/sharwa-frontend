import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { reorderPickups } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `POST /api/v1/shipping/pickup-locations/reorder/` `{ordered_ids}` — the server renumbers `sort_order`. */
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(reorderPickups(store, (await readBody(request)).ordered_ids), { delay: 180 }));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
export async function POST(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/pickup-locations/reorder/", () => mockPOST(request));
}
