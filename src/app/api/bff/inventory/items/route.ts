import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listItems } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/items/?product&status&q` — serialised units (M21 US-21.5). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listItems(store, url.searchParams), { delay: 150 }), { permission: "inventory.view" });
}
