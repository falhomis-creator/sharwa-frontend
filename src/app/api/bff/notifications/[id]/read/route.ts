import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { markRead } from "@/mocks/notifications/state";

/** `POST /api/v1/notifications/<id>/read/` → `{read_at}`. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/notifications/[id]/read">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    const res = markRead(store, session, id);
    return res ? mockJson(res, { delay: 80 }) : mockJson({ detail: "الإشعار غير موجود." }, { status: 404 });
  });
}
