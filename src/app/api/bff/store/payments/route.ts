import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { patchStorePayments, readStorePayments } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/**
 * `GET/PATCH /api/v1/store/payments/` `{enable_sharwa_pay?, enable_manual_payment?}` (M14 §7).
 * Same fields as the M34 «الدفع» settings section — one row, so both screens agree.
 */
export function GET(request: Request) {
  return ownerRoute(request, ({ store, storeHost }) => mockJson(readStorePayments(store, storeHost), { delay: 140 }));
}

export function PATCH(request: Request) {
  return ownerRoute(request, async ({ store, storeHost }) => respond(patchStorePayments(store, storeHost, await readBody(request)), { delay: 200 }));
}
