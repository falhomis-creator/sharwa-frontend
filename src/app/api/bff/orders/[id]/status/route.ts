import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { actorName } from "@/mocks/catalog/products";
import { setFinancialStatus } from "@/mocks/orders/state";

/** `POST /api/v1/orders/<id>/status/` `{status, version}` — `refunded` is refused (refund path only). Live: INT-007. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/orders/[id]/status">) {
  const id = Number((await params).id);
  return liveOrMock(request, "orders", `/api/v1/orders/${id}/status/`, () =>
    mockRoute(request, async ({ store, session }) => respond(setFinancialStatus(store, id, await readBody(request), actorName(session))), {
      permission: "orders.update_status",
    }),
  );
}
