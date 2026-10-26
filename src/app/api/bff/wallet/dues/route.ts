import { liveOrMock } from "@/lib/bff/live-route";
import { mockJson } from "@/mocks/runtime";
import { listDues } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/wallet/dues/?kind=commission|app_charge&status&page` → `{totals, results}` — read only (M14 §7, US-14.5). */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store, url }) => mockJson(listDues(store, url.searchParams), { delay: 180 }));
}

// INT-020: `liveOrMock` module `payments` → Django; the fixture handler above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/wallet/dues/", () => mockGET(request));
}
