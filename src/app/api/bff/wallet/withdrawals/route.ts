import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createWithdrawal, listWithdrawals } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/**
 * `GET/POST /api/v1/wallet/withdrawals/` `{currency, amount, payout_account_id}` → `{id, status}` (M14 §7, FR-14.04).
 * Live: Django debits the amount at once (held until the platform decides) and the forwarded
 * `Idempotency-Key` header makes a retried POST return the same request (200) instead of a second debit.
 */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listWithdrawals(store, url.searchParams), { delay: 180 }));
}

function mockPOST(request: Request) {
  return ownerRoute(request, async ({ store }) => respond(createWithdrawal(store, await readBody(request)), { delay: 280 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handlers above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/wallet/withdrawals/", () => mockGET(request));
}

export function POST(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/wallet/withdrawals/", () => mockPOST(request));
}
