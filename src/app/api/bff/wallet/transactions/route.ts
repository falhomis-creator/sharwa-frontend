import { liveOrMock } from "@/lib/bff/live-route";
import { mockJson } from "@/mocks/runtime";
import { listTransactions } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/wallet/transactions/?currency&type&from&to&page` (M14 §7, FR-14.06). */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listTransactions(store, url.searchParams), { delay: 200 }));
}

// INT-020: `liveOrMock` module `payments` → Django; the fixture handler above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/wallet/transactions/", () => mockGET(request));
}
