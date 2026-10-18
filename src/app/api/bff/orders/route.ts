import { hasPermission } from "@/lib/access";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { actorName } from "@/mocks/catalog/products";
import { createOrder, listOrders } from "@/mocks/orders/state";

/**
 * `GET /api/v1/orders/?status&payment_status&fulfillment_status&channel&location&from&to&q&page&page_size`
 * and `POST /api/v1/orders/` (manual / phone / B2B draft) — M06 §7, `[NEEDS BACKEND]`.
 * The Ready rows (`/api/v1/returns/*`, `/api/v1/orders/b2b-draft*`) keep going through the
 * transparent `/api/v1/[...path]` passthrough untouched.
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listOrders(store, url.searchParams), { delay: 220 }), {
    permission: "orders.view",
  });
}

export async function POST(request: Request) {
  return mockRoute(
    request,
    async ({ store, session }) => {
      const canB2b = hasPermission(
        { kind: session.kind, features: session.features, permissions: session.staff?.permissions },
        "orders.create_b2b",
      );
      return respond(createOrder(store, await readBody(request), actorName(session), canB2b));
    },
    { permission: "orders.view" },
  );
}
