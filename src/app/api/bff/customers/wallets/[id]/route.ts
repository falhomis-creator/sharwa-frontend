import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { walletById, walletDetailView } from "@/mocks/wallets/state";

/** `GET /api/v1/customers/wallets/<id>/` → the wallet with its points balance (M35 §7). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/customers/wallets/[id]">) {
  const { id } = await params;
  return mockRoute(
    request,
    ({ store }) => {
      const wallet = walletById(store, Number(id));
      if (!wallet) return mockJson({ detail: "المحفظة غير موجودة." }, { status: 404 });
      return mockJson(walletDetailView(store, wallet), { delay: 160 });
    },
    { permission: "customers.view" },
  );
}

// INT-028: `liveOrMock` module `wallets` → Django `api/views_wallets.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/customers/wallets/[id]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/customers/wallets/${encodeURIComponent(p.id)}/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "wallets", await upstream(ctx), () => mockGET(request, ctx));
}
