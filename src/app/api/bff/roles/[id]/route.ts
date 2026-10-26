import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { deleteRole, roleView, saveRole, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET/PATCH/DELETE /api/v1/roles/<id>/` — system roles answer 403 on write (FR-18.04). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/roles/[id]">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store }) => {
      const r = staffState(store).roles.find((x) => x.id === id);
      return r ? mockJson(roleView(store, r), { delay: 100 }) : mockJson({ detail: "الدور غير موجود." }, { status: 404 });
    },
    { permission: "staff.view" },
  );
}

async function mockPATCH(request: Request, { params }: RouteContext<"/api/bff/roles/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => respond(saveRole(store, id, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage_roles",
  });
}

async function mockDELETE(request: Request, { params }: RouteContext<"/api/bff/roles/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => respond(deleteRole(store, id, sessionActor(store, session).name)), { permission: "staff.manage_roles" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/roles/[id]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/roles/${encodeURIComponent(p.id)}/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockDELETE(request, ctx));
}
