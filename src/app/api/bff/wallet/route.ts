import { mockJson } from "@/mocks/runtime";
import { readWallet } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/wallet/` → `{balances:[{currency, display_balance, display_available, …}]}` — four currencies, never summed (M14 §7). */
export function GET(request: Request) {
  return ownerRoute(request, ({ store }) => mockJson(readWallet(store), { delay: 170 }));
}
