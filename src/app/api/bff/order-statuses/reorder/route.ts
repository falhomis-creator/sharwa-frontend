import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { reorderStatuses } from "@/mocks/orders/state";

/** `POST /api/v1/order-statuses/reorder/` `{ordered_ids}`. Live: INT-007. */
export async function POST(request: Request) {
  return liveOrMock(request, "orders", "/api/v1/order-statuses/reorder/", () =>
    mockRoute(request, async ({ store }) => respond(reorderStatuses(store, (await readBody(request)).ordered_ids)), {
      permission: "orders.update_status",
    }),
  );
}
