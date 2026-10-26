import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getStaff, patchStaff, sessionActor } from "@/mocks/staff/state";

/** `GET/PATCH /api/v1/staff/<id>/` (M18 §7). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store }) => {
      const row = getStaff(store, id);
      return row ? mockJson(row, { delay: 120 }) : mockJson({ detail: "الموظف غير موجود." }, { status: 404 });
    },
    { permission: "staff.view" },
  );
}

async function mockPATCH(request: Request, { params }: RouteContext<"/api/bff/staff/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => respond(patchStaff(store, id, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage",
  });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPATCH(request, ctx));
}
