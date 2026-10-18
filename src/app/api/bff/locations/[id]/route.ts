import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getLocation, locationDetail, patchLocation } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `GET/PATCH /api/v1/locations/<id>/` — the object carries the server-computed `display_type`. */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store }) => {
    const l = getLocation(store, Number(id));
    return l ? mockJson(locationDetail(store, l), { delay: 140 }) : mockJson({ detail: "الموقع غير موجود." }, { status: 404 });
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/locations/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchLocation(store, Number(id), await readBody(request)), { delay: 240 }));
}
