import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getLocation, locationDetail, patchLocation } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `GET/PATCH /api/v1/locations/<id>/` — the object carries the server-computed `display_type`. */
async function mockGET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store }) => {
    const l = getLocation(store, Number(id));
    return l ? mockJson(locationDetail(store, l), { delay: 140 }) : mockJson({ detail: "الموقع غير موجود." }, { status: 404 });
  });
}

async function mockPATCH(request: Request, ctx: RouteContext<"/api/bff/locations/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchLocation(store, Number(id), await readBody(request)), { delay: 240 }));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/locations/[id]">;

async function upstream(ctx: Ctx) {
  const p = await ctx.params;
  return `/api/v1/locations/${encodeURIComponent(p.id)}/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "locations", await upstream(ctx), () => mockPATCH(request, ctx));
}
