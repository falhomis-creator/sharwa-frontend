import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { readAlert } from "@/mocks/staff/state";

/** `POST /api/v1/behavior-alerts/<id>/read/`. */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/behavior-alerts/[id]/read">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(readAlert(store, id)), { permission: "staff.view" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/behavior-alerts/[id]/read">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/behavior-alerts/${encodeURIComponent(p.id)}/read/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockPOST(request, ctx));
}
