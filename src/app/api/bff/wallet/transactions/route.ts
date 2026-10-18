import { mockJson } from "@/mocks/runtime";
import { listTransactions } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/wallet/transactions/?currency&type&from&to&page` (M14 §7, FR-14.06). */
export function GET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listTransactions(store, url.searchParams), { delay: 200 }));
}
