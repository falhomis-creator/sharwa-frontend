import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listPointsTransactions } from "@/mocks/wallets/state";

/** `GET /api/v1/loyalty/points/<phone>/transactions/?type&page` → `{balance, count, results}` (M35 US-35.4). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/loyalty/points/[phone]/transactions">) {
  const { phone } = await params;
  return mockRoute(request, ({ store, url }) => mockJson(listPointsTransactions(store, decodeURIComponent(phone), url.searchParams), { delay: 140 }), {
    permission: "customers.view",
  });
}

// INT-028: `liveOrMock` module `wallets` → Django `api/views_wallets.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/loyalty/points/[phone]/transactions">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/loyalty/points/${encodeURIComponent(decodeURIComponent(p.phone))}/transactions/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "wallets", await upstream(ctx), () => mockGET(request, ctx));
}
