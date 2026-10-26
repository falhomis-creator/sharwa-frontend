import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createAccount, listAccounts } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/payments/payout-accounts/?account_type` · `POST` (M14 §7, US-14.3). */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listAccounts(store, url.searchParams), { delay: 170 }));
}

function mockPOST(request: Request) {
  return ownerRoute(request, async ({ store }) => respond(createAccount(store, await readBody(request)), { delay: 220 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handlers above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/payments/payout-accounts/", () => mockGET(request));
}

export function POST(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/payments/payout-accounts/", () => mockPOST(request));
}
