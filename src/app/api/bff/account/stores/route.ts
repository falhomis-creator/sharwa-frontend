import { env } from "@/env";
import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import { accountStoresMock } from "@/mocks/dashboard/stores";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";

/**
 * `GET /api/v1/account/stores/` → the owner's stores for the topbar switcher
 * (M03 §7, `[NEEDS BACKEND]`, `MerchantAccount`). Staff have no switcher (US-03.3.2).
 */
export async function GET(request: Request) {
  const upstream = contextFromRequest(request);
  const ctx = { store: upstream.store, storeHost: storeHostFor(upstream.store, upstream.storeHost) };
  const session = await sessionFromRequest(request, ctx);
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (session.kind !== "merchant") return jsonResponse([], { status: 200 });
  if (!isMocksOn()) return notAvailable();
  return mockJson(accountStoresMock(ctx.store, env.TENANT_BASE_DOMAIN));
}
