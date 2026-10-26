import { env } from "@/env";
import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { isStoreOwner } from "@/lib/access";
import { rollupMock } from "@/mocks/rollup/state";
import { mockJson } from "@/mocks/runtime";

/**
 * `GET /api/v1/merchant/stores/?from&to` (M43 §7, INT-049). The owner's linked stores with their
 * snapshot counts and the server's totals; the same contract feeds the topbar switcher (FR-43.05).
 *
 * live (`rollup` in SHARWA_LIVE_MODULES) → `api/views_rollup.py` + `tenants/merchant_rollup.py`:
 * the `MerchantAccount` linked to THIS store (`MerchantAccountClient`), its stores' public
 * `TenantStatsSnapshot` rows inside the range (default the last 30 days, reversed range swapped),
 * revenue-sorted, totals and `display_revenue_sar` from the server; staff 403, no session 401.
 * mock → `src/mocks/rollup/state.ts` behind the same owner gate.
 */
export async function GET(request: Request) {
  return liveOrMock(request, "rollup", "/api/v1/merchant/stores/", () =>
    mockRoute(request, ({ store, session, url }) => {
      if (!isStoreOwner(session)) return mockJson({ detail: "هذه الصفحة لمالك المتجر فقط." }, { status: 403 });
      return mockJson(rollupMock(store, env.TENANT_BASE_DOMAIN, url.searchParams), { delay: 160 });
    }),
  );
}
