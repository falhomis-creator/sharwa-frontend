import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { loyaltyProgram } from "@/mocks/loyalty/program";
import { mockJson } from "@/mocks/runtime";

/**
 * Read-only here (M35 US-35.4); edited in M13 (`/api/bff/marketing/loyalty`). Live: Django
 * `customers/loyalty-program/` — `customers.view` (M13's `loyalty/program/` is owner-only).
 */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(loyaltyProgram(store), { delay: 80 }), { permission: "customers.view" });
}

// INT-028: `liveOrMock` module `wallets` → Django `api/views_wallets.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "wallets", "/api/v1/customers/loyalty-program/", () => mockGET(request));
}
