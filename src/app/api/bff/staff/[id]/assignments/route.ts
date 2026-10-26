import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { assignments, putAssignments, sessionActor } from "@/mocks/staff/state";

/** `GET/PUT /api/v1/staff/<id>/assignments/` `[{location_id, role_id, location_role}]` (US-18.3). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/assignments">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(assignments(store, id), { delay: 120 }), { permission: "staff.view" });
}

async function mockPUT(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/assignments">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => {
      const body: unknown = await request.json().catch(() => null);
      return respond(putAssignments(store, id, body, sessionActor(store, session).name));
    },
    { permission: "staff.manage_assignments" },
  );
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/assignments">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/assignments/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}

export async function PUT(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPUT(request, ctx));
}
