import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { patchStorePayments, readStorePayments } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/**
 * `GET/PATCH /api/v1/store/payments/` `{enable_sharwa_pay?, enable_manual_payment?}` (M14 §7).
 * Same fields as the M34 «الدفع» settings section — one row, so both screens agree.
 */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store, storeHost }) => mockJson(readStorePayments(store, storeHost), { delay: 140 }));
}

function mockPATCH(request: Request) {
  return ownerRoute(request, async ({ store, storeHost }) => respond(patchStorePayments(store, storeHost, await readBody(request)), { delay: 200 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handlers above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/store/payments/", () => mockGET(request));
}

export function PATCH(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/store/payments/", () => mockPATCH(request));
}
