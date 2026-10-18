import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { adjustStock } from "@/mocks/inventory/state";

/** `POST /api/v1/inventory/adjustments/` `{product_id, variant_id?, location_id?, delta?|new_quantity?, reason, note}` → `{stock, movement_id}` (M21 US-21.2). */
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => respond(adjustStock(store, await readBody(request), actorName(session)), { delay: 240 }), {
    permission: "inventory.adjust",
  });
}
