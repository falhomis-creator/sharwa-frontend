import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { resolveReview } from "@/mocks/shipping/ops";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `POST /api/v1/shipping/zone-review/<order_id>/resolve/` `{action: confirm|convert_pickup|cancel, pickup_location_id?}`. */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/shipping/zone-review/[orderId]/resolve">) {
  const { orderId } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(resolveReview(store, Number(orderId), await readBody(request)), { delay: 220 }));
}
