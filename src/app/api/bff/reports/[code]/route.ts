import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { readSettings } from "@/mocks/settings/state";
import { reportAllowed, reportData } from "@/mocks/reports/data";
import { getReportDef } from "@/mocks/reports/registry";
import { reportsFeatureOff } from "@/app/api/bff/reports/_guard";

/**
 * `GET /api/v1/reports/<code>/?from&to&compare_from&compare_to&location&ordering&page` — M25 §7.
 * A report the member may not open answers 403 with its title only (no numbers — §8).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/reports/[code]">) {
  const { code } = await ctx.params;
  return mockRoute(
    request,
    ({ store, storeHost, session, url }) => {
      const off = reportsFeatureOff(session);
      if (off) return off;
      const def = getReportDef(code);
      if (def && !reportAllowed(session, def)) {
        return mockJson({ detail: "ليست لديك صلاحية لعرض هذا التقرير.", report_title: def.title }, { status: 403, delay: 120 });
      }
      return respond(reportData(store, code, url.searchParams, readSettings(store, storeHost).timezone), { delay: 260 });
    },
    { permission: "reports.view" },
  );
}
