import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listOrderRefunds } from "@/mocks/returns/state";

/** `GET /api/v1/orders/refunds/?method&from&to&q&page` — M24 §7 `[NEEDS BACKEND]` (today HTML `order_refunds_list`). Read-only. */
export async function GET(request: Request) {
  return mockRoute(
    request,
    ({ store, url, session }) =>
      session.features.includes("refunds") ? mockJson(listOrderRefunds(store, url.searchParams), { delay: 160 }) : mockJson({ detail: "ميزة المرتجعات غير مفعّلة في خطتك." }, { status: 403 }),
    { permission: "orders.refund" },
  );
}
