import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { actorName } from "@/mocks/catalog/products";
import { paymentAction } from "@/mocks/orders/state";

const ACTIONS = new Set(["confirm", "approve", "reject"]);

/** `POST /api/v1/orders/<id>/payment/{confirm|approve|reject}/` `{version}` (US-06.4). Live: INT-007. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/orders/[id]/payment/[action]">) {
  const { id, action } = await params;
  // Only the three known actions are ever forwarded upstream (no arbitrary path segment).
  if (!ACTIONS.has(action)) return mockJson({ detail: "إجراء غير معروف." }, { status: 404 });
  const orderId = Number(id);
  return liveOrMock(request, "orders", `/api/v1/orders/${orderId}/payment/${action}/`, () =>
    mockRoute(request, async ({ store, session }) => respond(paymentAction(store, orderId, action, await readBody(request), actorName(session))), {
      permission: "orders.update_status",
    }),
  );
}
