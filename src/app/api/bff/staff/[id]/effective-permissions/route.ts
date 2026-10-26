import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { effectivePermissions } from "@/mocks/staff/state";

/** `GET /api/v1/staff/<id>/effective-permissions/?location_id` — the server's `permission_resolver` result (FR-18.05). */
async function mockGET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/effective-permissions">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store, url }) => {
      const loc = url.searchParams.get("location_id");
      return mockJson(effectivePermissions(store, id, loc ? Number(loc) : null), { delay: 100 });
    },
    { permission: "staff.view" },
  );
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/staff/[id]/effective-permissions">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/staff/${encodeURIComponent(p.id)}/effective-permissions/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "staff", await upstream(ctx), () => mockGET(request, ctx));
}
