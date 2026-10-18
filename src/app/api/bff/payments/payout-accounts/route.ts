import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createAccount, listAccounts } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/payments/payout-accounts/?account_type` · `POST` (M14 §7, US-14.3). */
export function GET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listAccounts(store, url.searchParams), { delay: 170 }));
}

export function POST(request: Request) {
  return ownerRoute(request, async ({ store }) => respond(createAccount(store, await readBody(request)), { delay: 220 }));
}
