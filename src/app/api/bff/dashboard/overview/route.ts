import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { overviewMock } from "@/mocks/dashboard/overview";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/** `GET /api/v1/dashboard/overview/` (M03 §7, `[NEEDS BACKEND]`). */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const ctx = { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) };
  const session = await sessionFromRequest(request, ctx);
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (!isMocksOn()) return notAvailable();
  return mockJson(overviewMock(ctx.store));
}
