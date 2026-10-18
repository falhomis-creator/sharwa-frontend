import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteStatus, saveStatus } from "@/mocks/orders/state";

/** `PATCH/DELETE /api/v1/order-statuses/<id>/` — the default status cannot be deleted (US-06.5.2). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/order-statuses/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store }) => respond(saveStatus(store, id, await readBody(request))), {
    permission: "orders.update_status",
  });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/order-statuses/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(deleteStatus(store, id)), { permission: "orders.update_status" });
}
