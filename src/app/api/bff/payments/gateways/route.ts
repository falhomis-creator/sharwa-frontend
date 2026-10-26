import { liveOrMock } from "@/lib/bff/live-route";
import { mockJson } from "@/mocks/runtime";
import { listGateways } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/payments/gateways/` → `[{gateway_code, name, is_enabled, has_credentials, fields:[…]}]` (M14 §7). Never a secret value. */
function mockGET(request: Request) {
  return ownerRoute(request, ({ store }) => mockJson(listGateways(store), { delay: 180 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handler above otherwise.
export function GET(request: Request) {
  return liveOrMock(request, "payments", "/api/v1/payments/gateways/", () => mockGET(request));
}
