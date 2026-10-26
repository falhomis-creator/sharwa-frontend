import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { b2bMock } from "@/mocks/b2b/router";

/**
 * `/api/bff/b2b/*` — M36's draft-form choices (INT-044). The drafts themselves are the transparent `/api/v1/orders/b2b-*`
 * passthrough (Ready before this task); quantity prices live under `/api/bff/products/<id>/extras/tier-prices`.
 *
 * `options` → live (`b2b` in SHARWA_LIVE_MODULES): Django `GET /api/v1/orders/b2b-options/` (`api/views_b2b.py`) —
 * `{roles, locations, multi_location, default_currency}`, for `orders.create_b2b` or `orders.approve_b2b`.
 * Anything else (the mock-only `_test/bump/<approval_id>` hook of `scripts/b2b-check.ts`) stays on the fixture.
 */
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const mock = () => mockRoute(request, (ctx) => b2bMock(request, path, ctx));
  const parts = path.filter(Boolean);
  if (parts.length === 1 && parts[0] === "options") return liveOrMock(request, "b2b", "/api/v1/orders/b2b-options/", mock);
  return mock();
}

export { handle as GET, handle as POST };
