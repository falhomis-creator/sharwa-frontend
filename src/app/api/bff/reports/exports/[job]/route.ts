import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { readExport } from "@/mocks/reports/exports";

/** `GET /api/v1/reports/exports/<job_id>/` → the job (`status`, `download_token`, `expires_at`, `error`) — polled every 5 s. */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/reports/exports/[job]">) {
  const { job } = await ctx.params;
  return liveOrMock(request, "reports", `/api/v1/reports/exports/${encodeURIComponent(job)}/`, () =>
    mockRoute(
      request,
      ({ store }) => (/^\d+$/.test(job) ? respond(readExport(store, Number(job)), { delay: 120 }) : mockJson({ detail: "مهمة التصدير غير موجودة." }, { status: 404 })),
      { permission: "reports.export" },
    ),
  );
}
