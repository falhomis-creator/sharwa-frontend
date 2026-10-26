import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { returnLocations } from "@/mocks/returns/state";

/**
 * `GET /api/bff/returns/options` → `{locations:[{id,name}]}` — the active locations for the
 * restock / RMA destination / scan pickers. Reads the M22 foundation; any signed-in member
 * (the scan screen is also open to `inventory.adjust`). Live: Django `returns/options/` — gated by
 * `refunds` only, so it works for stores without the `multi_location` plan feature (M22).
 */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson({ locations: returnLocations(store) }, { delay: 80 }));
}

// INT-026: `liveOrMock` module `returns` → Django `api/views_returns.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "returns", "/api/v1/returns/options/", () => mockGET(request));
}
