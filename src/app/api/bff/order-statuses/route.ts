import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listStatuses, saveStatus } from "@/mocks/orders/state";

/** `GET/POST /api/v1/order-statuses/` — the merchant's fulfilment workflow (US-06.5). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listStatuses(store), { delay: 120 }), { permission: "orders.view" });
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store }) => respond(saveStatus(store, null, await readBody(request))), {
    permission: "orders.update_status",
  });
}
