import { contextFromRequest, forwardResponse, jsonResponse } from "@/lib/bff/upstream";
import { tryStoreTarget } from "@/lib/bff/target-adapter";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { countersMock } from "@/mocks/dashboard/counters";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/v1/dashboard/counters/` (M03 §7) — the four sidebar badges in ONE request, polled
 * every 60s and never while the tab is hidden (FR-03.12).
 *
 * Shipped in Django (`api/views_dashboard.py`, INT-003): Django answers whenever it is up,
 * session and per-permission zeroing included. The fixture only covers a route Django does not
 * have (unknown fixture store) or an unreachable backend, while `SHARWA_MOCKS=on`.
 */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const live = await tryStoreTarget(request, "/api/v1/dashboard/counters/", upstream);
  if (live) return forwardResponse(live);

  const ctx = { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) };
  const session = await sessionFromRequest(request, ctx);
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (!isMocksOn()) return notAvailable();
  return mockJson(countersMock(ctx.store));
}
