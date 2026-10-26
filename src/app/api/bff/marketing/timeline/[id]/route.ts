import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteEvent, updateEvent } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

type Ctx = RouteContext<"/api/bff/marketing/timeline/[id]">;

/** `PATCH|DELETE /api/v1/promotions/timeline/{id}/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.06). */
async function mockPATCH(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return respond(updateEvent(store, id, await readBody(request)));
  });
}
async function mockDELETE(request: Request, { params }: Ctx) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return respond(deleteEvent(store, id));
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/marketing/timeline/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/timeline/${id}/`, () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/marketing/timeline/[id]">) {
  const id = encodeURIComponent((await ctx.params).id);
  return liveOrMock(request, "marketing", `/api/v1/promotions/timeline/${id}/`, () => mockDELETE(request, ctx));
}
