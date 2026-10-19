import { env } from "@/env";
import { mockRoute } from "@/lib/bff/mock-route";
import { isStoreOwner } from "@/lib/access";
import { rollupMock } from "@/mocks/rollup/state";
import { mockJson } from "@/mocks/runtime";

/**
 * `GET /api/v1/merchant/stores/?from&to` (M43 §7 — `[NEEDS BACKEND]`, today the HTML
 * `merchant_master_dashboard`). The owner's linked stores with their snapshot counts and
 * the server's totals; the same contract feeds the topbar switcher (FR-43.05).
 * Owner only: a `MerchantAccount` is the merchant's phone, staff have none (403).
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => {
    if (!isStoreOwner(session)) return mockJson({ detail: "هذه الصفحة لمالك المتجر فقط." }, { status: 403 });
    return mockJson(rollupMock(store, env.TENANT_BASE_DOMAIN, url.searchParams), { delay: 160 });
  });
}
