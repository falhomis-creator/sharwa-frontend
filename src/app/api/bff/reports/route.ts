import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { reportIndex } from "@/mocks/reports/data";
import { reportsFeatureOff } from "@/app/api/bff/reports/_guard";

/** `GET /api/v1/reports/` — M25 §7: the registry grouped by category with `allowed` per member. */
export async function GET(request: Request) {
  return liveOrMock(request, "reports", "/api/v1/reports/", () =>
    mockRoute(request, ({ session }) => reportsFeatureOff(session) ?? mockJson(reportIndex(session), { delay: 160 }), { permission: "reports.view" }),
  );
}
