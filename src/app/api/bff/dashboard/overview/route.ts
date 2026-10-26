import { contextFromRequest, forwardResponse, jsonResponse } from "@/lib/bff/upstream";
import { tryStoreTarget } from "@/lib/bff/target-adapter";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { overviewMock } from "@/mocks/dashboard/overview";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/v1/dashboard/overview/` (M03 §7). Django first (`api/views_dashboard.py`, INT-003),
 * exactly like the server-side first paint in `features/dashboard-shell/api/overview.ts`; the
 * fixture only while the route is missing upstream or Django is unreachable (`SHARWA_MOCKS=on`).
 */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const live = await tryStoreTarget(request, "/api/v1/dashboard/overview/", upstream);
  if (live) return forwardResponse(live);

  const ctx = { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) };
  const session = await sessionFromRequest(request, ctx);
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (!isMocksOn()) return notAvailable();
  return mockJson(overviewMock(ctx.store));
}
