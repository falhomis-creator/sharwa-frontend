import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { putRoster, roster } from "@/mocks/staff/state";

/** `GET/PUT /api/v1/staff/<id>/roster/` — 7 rows, `weekday 0 = الأحد` (US-18.4.4). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/roster">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(roster(store, id), { delay: 80 }), { permission: "staff.view" });
}

async function mockPUT(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/roster">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store }) => {
      const body: unknown = await request.json().catch(() => null);
      return respond(putRoster(store, id, body));
    },
    { permission: "staff.manage" },
  );
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/roster">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/roster/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}

export async function PUT(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPUT(request, ctx));
}
