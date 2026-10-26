import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listPoints } from "@/mocks/wallets/state";

/** `GET /api/v1/loyalty/points/?q&page` — every `CustomerPoints` row, read-only (M35 US-35.5). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listPoints(store, url.searchParams), { delay: 180 }), { permission: "customers.view" });
}

// INT-028: `liveOrMock` module `wallets` → Django `api/views_wallets.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "wallets", "/api/v1/loyalty/points/", () => mockGET(request));
}
