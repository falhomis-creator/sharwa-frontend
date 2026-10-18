import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { actorName } from "@/mocks/catalog/products";
import { getOrder, patchOrder } from "@/mocks/orders/state";

/**
 * `GET /api/v1/orders/<id>/` (Ready in part as `order_detail_api`; unified here) and a proposed
 * `PATCH` `{version, pickup_location_id? , gift_message?}` for «تحويل إلى استلام» and the gift note.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/orders/[id]">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store }) => {
      const order = getOrder(store, id);
      return order ? mockJson(order, { delay: 180 }) : mockJson({ detail: "الطلب غير موجود." }, { status: 404 });
    },
    { permission: "orders.view" },
  );
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/orders/[id]">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store, session }) => respond(patchOrder(store, id, await readBody(request), actorName(session))),
    { permission: "orders.update_status" },
  );
}
