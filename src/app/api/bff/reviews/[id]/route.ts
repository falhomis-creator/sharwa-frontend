import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { replyToReview } from "@/mocks/customers/state";

/**
 * `PATCH /api/v1/reviews/<id>/` `{admin_reply}` (M07 US-07.2.6) — the store's public reply
 * under a `ProductReview`; empty clears it. The storefront shows it on the product page.
 */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/reviews/[id]">) {
  const { id } = await params;
  return mockRoute(request, async ({ store }) => respond(replyToReview(store, Number(id), await readBody(request))), { permission: "customers.edit_profile" });
}
