import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { refundOrder } from "@/mocks/orders/state";

/** `POST /api/v1/orders/<id>/refunds/` `{amount, method, reason, version}` (US-06.7). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/orders/[id]/refunds">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => respond(refundOrder(store, id, await readBody(request), actorName(session))),
    { permission: "orders.refund" },
  );
}
