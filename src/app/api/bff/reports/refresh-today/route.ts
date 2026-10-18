import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { refreshToday } from "@/mocks/reports/data";
import { reportsFeatureOff } from "@/app/api/bff/reports/_guard";

/** `POST /api/v1/reports/refresh-today/` → `{refreshed_at}` — recompute today's `DailyStoreMetrics` (US-25.5). */
export async function POST(request: Request) {
  return mockRoute(request, ({ store, session }) => reportsFeatureOff(session) ?? mockJson(refreshToday(store), { delay: 400 }), { permission: "reports.view" });
}
