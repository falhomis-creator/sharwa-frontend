import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { reorderAccounts } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `POST /api/v1/payments/payout-accounts/reorder/` `{ordered_ids}` (every account of ONE type) → that type's list in its new order (M14 US-14.3.2). */
function mockPOST(request: Request) {
  return ownerRoute(request, async ({ store }) => respond(reorderAccounts(store, await readBody(request)), { delay: 180 }));
}

// INT-020: `liveOrMock` module `payments` → Django; the fixture handler above otherwise.
export function POST(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/payments/payout-accounts/reorder/", () => mockPOST(request));
}
