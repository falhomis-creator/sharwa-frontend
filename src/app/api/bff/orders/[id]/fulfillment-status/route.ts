import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { setFulfillmentStatus } from "@/mocks/orders/state";

/** `POST /api/v1/orders/<id>/fulfillment-status/` `{status_id, version}` → 200 / 409 (FR-06.06). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/orders/[id]/fulfillment-status">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => respond(setFulfillmentStatus(store, id, await readBody(request), actorName(session))),
    { permission: "orders.update_status" },
  );
}
