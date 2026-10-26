import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { markRead } from "@/mocks/notifications/state";

/** `POST /api/v1/notifications/<id>/read/` → `{read_at}`. Live: INT-009. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/notifications/[id]/read">) {
  const id = Number((await params).id);
  return liveOrMock(request, "notifications", `/api/v1/notifications/${id}/read/`, () =>
    mockRoute(request, ({ store, session }) => {
      const res = markRead(store, session, id);
      return res ? mockJson(res, { delay: 80 }) : mockJson({ detail: "الإشعار غير موجود." }, { status: 404 });
    }),
  );
}
