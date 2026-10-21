import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { actorName } from "@/mocks/catalog/products";
import { reportAllowed } from "@/mocks/reports/data";
import { createExport } from "@/mocks/reports/exports";
import { getReportDef } from "@/mocks/reports/registry";
import { reportsFeatureOff } from "@/app/api/bff/reports/_guard";

/** `POST /api/v1/reports/<code>/exports/` `{format, params}` → the job — M25 US-25.3 (`reports.export`). */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/reports/[code]/exports">) {
  const { code } = await ctx.params;
  return liveOrMock(request, "reports", `/api/v1/reports/${encodeURIComponent(code)}/exports/`, () =>
    mockRoute(
      request,
      async ({ store, session }) => {
        const off = reportsFeatureOff(session);
        if (off) return off;
        const def = getReportDef(code);
        if (def && !reportAllowed(session, def)) return mockJson({ detail: "ليست لديك صلاحية لتصدير هذا التقرير." }, { status: 403 });
        return respond(createExport(store, code, await readBody(request), actorName(session)), { delay: 220 });
      },
      { permission: "reports.export" },
    ),
  );
}
