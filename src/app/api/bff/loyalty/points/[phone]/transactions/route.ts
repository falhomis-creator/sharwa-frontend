import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listPointsTransactions } from "@/mocks/wallets/state";

/** `GET /api/v1/loyalty/points/<phone>/transactions/?type&page` → `{balance, count, results}` (M35 US-35.4). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/loyalty/points/[phone]/transactions">) {
  const { phone } = await params;
  return mockRoute(request, ({ store, url }) => mockJson(listPointsTransactions(store, decodeURIComponent(phone), url.searchParams), { delay: 140 }), {
    permission: "customers.view",
  });
}
