import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listExports } from "@/mocks/reports/exports";
import { reportsFeatureOff } from "@/app/api/bff/reports/_guard";

/** `GET /api/v1/reports/exports/` — «تصديراتي», the last 50 jobs (FR-25.07). */
export async function GET(request: Request) {
  return liveOrMock(request, "reports", "/api/v1/reports/exports/", () =>
    mockRoute(request, ({ store, session }) => reportsFeatureOff(session) ?? mockJson(listExports(store), { delay: 160 }), { permission: "reports.export" }),
  );
}
