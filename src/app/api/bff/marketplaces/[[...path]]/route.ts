import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { marketplacesMock } from "@/mocks/marketplaces/router";

/**
 * `/api/bff/marketplaces/*` → `/api/v1/marketplaces/*` (M28 §7). One optional catch-all: the path after
 * `marketplaces/` is the upstream path verbatim (plus Django's trailing slash).
 *
 *   mock mode → `src/mocks/marketplaces` behind the merchant/staff session (`mockRoute`; feature + permission in the router);
 *   live mode → `marketplaces` in `SHARWA_LIVE_MODULES` (INT-038): `api/views_marketplaces.py` answers 401, the plan feature
 *               `marketplaces` / `channels.marketplaces.manage` 403; `amazon/oauth/start` is a 302 to Seller Central and
 *               `jobs/<id>/errors.csv` a streamed CSV, both forwarded as is.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  return liveOrMock(request, "marketplaces", `/api/v1/marketplaces/${joined ? `${joined}/` : ""}`, () =>
    mockRoute(request, (ctx) => marketplacesMock(request, path, ctx)),
  );
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
