import { contextFromRequest, forwardResponse, jsonResponse } from "@/lib/bff/upstream";
import { tryStoreTarget } from "@/lib/bff/target-adapter";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { overviewMock } from "@/mocks/dashboard/overview";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `POST /api/v1/dashboard/overview/refresh/` → the `today` block only (M03 FR-03.09). Django
 * first (`api/views_dashboard.py`, INT-003): it recomputes today's `DailyStoreMetrics` row,
 * shares the 5-minute cooldown with the reports refresh (429 + Retry-After) and answers 403 to
 * staff without `reports.sales.view`. The fixture only while the route is missing or unreachable.
 */
export async function POST(request: Request) {
  const upstream = contextFromRequest(request);
  const live = await tryStoreTarget(request, "/api/v1/dashboard/overview/refresh/", upstream, "POST");
  if (live) return forwardResponse(live);

  const ctx = { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) };
  const session = await sessionFromRequest(request, ctx);
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (!isMocksOn()) return notAvailable();
  return mockJson(overviewMock(ctx.store, new Date().toISOString()).today, { delay: 200 });
}
