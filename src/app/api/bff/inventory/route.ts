import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listInventory } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/?q&status&location&category&is_serialized&page&page_size` — M21 §7 `[NEEDS BACKEND]`. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listInventory(store, url.searchParams), { delay: 200 }), { permission: "inventory.view" });
}
