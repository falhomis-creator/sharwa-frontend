import { readBody, respond } from "@/lib/bff/mock-route";
import { reorderAccounts } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `POST /api/v1/payments/payout-accounts/reorder/` `{ordered_ids}` → the type's list in its new order (M14 US-14.3.2). */
export function POST(request: Request) {
  return ownerRoute(request, async ({ store }) => respond(reorderAccounts(store, await readBody(request)), { delay: 180 }));
}
