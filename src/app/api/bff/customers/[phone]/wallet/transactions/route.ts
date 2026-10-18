import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { walletTab } from "@/mocks/customers/state";

/** `GET /api/v1/customers/<phone>/wallet/transactions/` → `{wallet|null, results: last 10}` (M35 ledger, read-only here). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/wallet/transactions">) {
  const { phone } = await params;
  return mockRoute(request, ({ store }) => mockJson(walletTab(store, decodeURIComponent(phone)), { delay: 150 }), { permission: "customers.view" });
}
