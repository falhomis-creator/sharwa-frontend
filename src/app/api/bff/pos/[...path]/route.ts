import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { posMock } from "@/mocks/pos/router";

/**
 * `/api/bff/pos/*` → `/api/v1/pos/*` (M16 §7). ONE catch-all adapter: the path after `pos/`
 * is the upstream path verbatim (plus Django's trailing slash), so no hook or screen changes.
 *
 *   mock mode → `src/mocks/pos` behind the merchant/staff session gate (`mockRoute`);
 *   live mode → `pos` in `SHARWA_LIVE_MODULES` (INT-033): a passthrough to
 *               `api/views_pos.py` — Django answers 401 (session), 403 `feature_disabled`
 *               (plan feature `pos`), the M22 location scope, the role's discount ceiling,
 *               the 428 refund OTP step-up and the `Idempotency-Key` replay itself
 *               (the header is forwarded by `upstreamFetch`).
 *
 * `__reset` is fixture-only (the functional check resets the POS seed) and never forwarded.
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.filter(Boolean).map(encodeURIComponent).join("/");
  const mock = () => mockRoute(request, (ctx) => posMock(request, path, ctx));
  if (joined === "__reset") return mock();
  return liveOrMock(request, "pos", `/api/v1/pos/${joined}/`, mock);
}

export { handle as GET, handle as POST };
