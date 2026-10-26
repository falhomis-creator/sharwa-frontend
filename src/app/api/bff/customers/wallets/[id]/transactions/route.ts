import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listWalletTransactions, walletById } from "@/mocks/wallets/state";

/** `GET /api/v1/customers/wallets/<id>/transactions/?reason&from&to&page` — the append-only ledger (M35 US-35.3). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/customers/wallets/[id]/transactions">) {
  const { id } = await params;
  return mockRoute(
    request,
    ({ store, url }) => {
      if (!walletById(store, Number(id))) return mockJson({ detail: "المحفظة غير موجودة." }, { status: 404 });
      return mockJson(listWalletTransactions(store, Number(id), url.searchParams), { delay: 160 });
    },
    { permission: "customers.view" },
  );
}

// INT-028: `liveOrMock` module `wallets` → Django `api/views_wallets.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/customers/wallets/[id]/transactions">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/customers/wallets/${encodeURIComponent(p.id)}/transactions/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "wallets", await upstream(ctx), () => mockGET(request, ctx));
}
