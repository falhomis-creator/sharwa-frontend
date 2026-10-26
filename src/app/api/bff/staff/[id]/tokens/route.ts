import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createToken, sessionActor, staffState } from "@/mocks/staff/state";

/** `GET/POST /api/v1/staff/<id>/tokens/` — the value is returned ONCE on create (FR-18.07). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/tokens">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).tokens.filter((t) => t.staff_id === id), { delay: 100 }), { permission: "staff.view_sessions" });
}

async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/tokens">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => respond(createToken(store, id, await readBody(request), sessionActor(store, session).name)), { permission: "staff.manage" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/tokens">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/tokens/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPOST(request, ctx));
}
