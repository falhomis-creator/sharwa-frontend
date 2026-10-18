import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { deactivationImpact, getLocation } from "@/mocks/locations/state";

/** `GET /api/v1/locations/<id>/deactivation-impact/` → `{on_hand_total, open_fulfillments}` (FR-22.08). */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/locations/[id]/deactivation-impact">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store }) => (getLocation(store, Number(id)) ? mockJson(deactivationImpact(store, Number(id)), { delay: 120 }) : mockJson({ detail: "الموقع غير موجود." }, { status: 404 })));
}
