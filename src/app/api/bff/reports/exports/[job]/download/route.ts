import { mockRoute } from "@/lib/bff/mock-route";
import { MOCK_HEADER, mockJson } from "@/mocks/runtime";
import { reportCsv } from "@/mocks/reports/data";
import { downloadExport } from "@/mocks/reports/exports";

/** `GET /api/v1/reports/exports/<job_id>/download/?token=` — the file (a small CSV in the mock, also for `xlsx`). */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/reports/exports/[job]/download">) {
  const { job } = await ctx.params;
  return mockRoute(
    request,
    ({ store, url }) => {
      if (!/^\d+$/.test(job)) return mockJson({ detail: "مهمة التصدير غير موجودة." }, { status: 404 });
      const res = downloadExport(store, Number(job), url.searchParams.get("token"));
      if (!res.ok) return mockJson(res.body, { status: res.status });
      const j = res.data;
      return new Response(reportCsv(store, j.report_code, j.params), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${j.report_code}-${j.id}.csv"`,
          "cache-control": "no-store",
          [MOCK_HEADER]: "1",
        },
      });
    },
    { permission: "reports.export" },
  );
}
