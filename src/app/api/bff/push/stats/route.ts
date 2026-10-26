import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { pushStats } from "@/mocks/storefront/passthrough";

/** `GET /api/v1/push/stats/` → `{active_subscribers}` — M44 US-44.5 (INT-016, Django `api/views_push.py`; owner or `reports.view`). */
export async function GET(request: Request) {
  return liveOrMock(request, "pwa", "/api/v1/push/stats/", () =>
    mockRoute(request, ({ store }) => mockJson(pushStats(store), { delay: 120 }), { permission: "reports.view" }),
  );
}
