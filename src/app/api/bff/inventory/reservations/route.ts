import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listReservations } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/reservations/?status&product` (M21 US-21.6). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listReservations(store, url.searchParams), { delay: 150 }), { permission: "inventory.view" });
}
