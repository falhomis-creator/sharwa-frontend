import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { adjustStock } from "@/mocks/inventory/state";

/** `POST /api/v1/inventory/adjustments/` `{product_id, variant_id?, location_id?, delta?|new_quantity?, reason, note}` → `{stock, movement_id}` (M21 US-21.2). */
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => respond(adjustStock(store, await readBody(request), actorName(session)), { delay: 240 }), {
    permission: "inventory.adjust",
  });
}

// INT-024: `liveOrMock` module `inventory` → Django `api/views_inventory.py`; the fixture handlers above otherwise.
export async function POST(request: Request) {
  return liveOrMock(request, "inventory", "/api/v1/inventory/adjustments/", () => mockPOST(request));
}
