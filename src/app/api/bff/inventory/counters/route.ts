import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { inventoryCounters } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/counters/` → `{low, out, backorder, in_stock, pending_writeoffs}` (M21 FR-21.10). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(inventoryCounters(store), { delay: 100 }), { permission: "inventory.view" });
}
