import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listReservations } from "@/mocks/inventory/state";

/** `GET /api/v1/inventory/reservations/?status&product` (M21 US-21.6). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listReservations(store, url.searchParams), { delay: 150 }), { permission: "inventory.view" });
}

// INT-024: `liveOrMock` module `inventory` → Django `api/views_inventory.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "inventory", "/api/v1/inventory/reservations/", () => mockGET(request));
}
