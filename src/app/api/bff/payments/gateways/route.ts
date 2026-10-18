import { mockJson } from "@/mocks/runtime";
import { listGateways } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET /api/v1/payments/gateways/` → `[{gateway_code, name, is_enabled, has_credentials, fields:[…]}]` (M14 §7). Never a secret value. */
export function GET(request: Request) {
  return ownerRoute(request, ({ store }) => mockJson(listGateways(store), { delay: 180 }));
}
