import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { paymentAction } from "@/mocks/orders/state";

/** `POST /api/v1/orders/<id>/payment/{confirm|approve|reject}/` `{version}` (US-06.4). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/orders/[id]/payment/[action]">) {
  const { id, action } = await params;
  return mockRoute(
    request,
    async ({ store, session }) => respond(paymentAction(store, Number(id), action, await readBody(request), actorName(session))),
    { permission: "orders.update_status" },
  );
}
