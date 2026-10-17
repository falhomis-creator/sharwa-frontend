import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { countersMock } from "@/mocks/dashboard/counters";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/v1/dashboard/counters/` (M03 §7, `[NEEDS BACKEND]`) — the four sidebar badges
 * in ONE request, polled every 60s and never while the tab is hidden (FR-03.12).
 */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const ctx = { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) };
  const session = await sessionFromRequest(request, ctx);
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (!isMocksOn()) return notAvailable();
  return mockJson(countersMock(ctx.store));
}
