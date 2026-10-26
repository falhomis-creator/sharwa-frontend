import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listInventory } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/?q&status&location&category&is_serialized&page&page_size` — M21 §7 (live: INT-024). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listInventory(store, url.searchParams), { delay: 200 }), { permission: "inventory.view" });
}

// INT-024: `liveOrMock` module `inventory` → Django `api/views_inventory.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "inventory", "/api/v1/inventory/", () => mockGET(request));
}
