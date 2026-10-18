import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listMovements } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/movements/?product&variant&location&reason&from&to&page` (M21 US-21.3). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listMovements(store, url.searchParams), { delay: 180 }), { permission: "inventory.view" });
}
