import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createWithdrawal, listWithdrawals } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET/POST /api/v1/wallet/withdrawals/` `{currency, amount, payout_account_id}` → `{id, status}` (M14 §7, FR-14.04). */
export function GET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listWithdrawals(store, url.searchParams), { delay: 180 }));
}

export function POST(request: Request) {
  return ownerRoute(request, async ({ store }) => respond(createWithdrawal(store, await readBody(request)), { delay: 280 }));
}
