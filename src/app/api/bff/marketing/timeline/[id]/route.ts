import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteEvent, updateEvent } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/timeline/[id]">;

/** `PATCH|DELETE /api/v1/promotions/timeline/{id}/` `[NEEDS BACKEND]` (M13 FR-13.06). */
export async function PATCH(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return respond(updateEvent(store, id, await readBody(request)));
  });
}
export async function DELETE(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return respond(deleteEvent(store, id));
  });
}
