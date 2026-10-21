import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { deleteSchedule, patchSchedule } from "@/mocks/reports/schedules";

const upstream = (id: string) => `/api/v1/reports/schedules/${encodeURIComponent(id)}/`;

/** `PATCH/DELETE /api/v1/reports/schedules/<id>/` — pause/resume, edit, delete. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/reports/schedules/[id]">) {
  const { id } = await ctx.params;
  return liveOrMock(request, "reports", upstream(id), () =>
    mockRoute(
      request,
      async ({ store }) => (/^\d+$/.test(id) ? respond(patchSchedule(store, Number(id), await readBody(request)), { delay: 200 }) : mockJson({ detail: "الاشتراك غير موجود." }, { status: 404 })),
      { permission: "reports.view" },
    ),
  );
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/reports/schedules/[id]">) {
  const { id } = await ctx.params;
  return liveOrMock(request, "reports", upstream(id), () =>
    mockRoute(
      request,
      ({ store }) => (/^\d+$/.test(id) ? respond(deleteSchedule(store, Number(id)), { delay: 200 }) : mockJson({ detail: "الاشتراك غير موجود." }, { status: 404 })),
      { permission: "reports.view" },
    ),
  );
}
