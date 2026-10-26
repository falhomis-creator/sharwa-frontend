import { liveOrMock } from "@/lib/bff/live-route";
import { mockJson } from "@/mocks/runtime";
import { readWallet } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/wallet/` → `{balances:[{currency, display_balance, display_available, …}]}` — four currencies, never summed (M14 §7). */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store }) => mockJson(readWallet(store), { delay: 170 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handler above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/wallet/", () => mockGET(request));
}
