import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { normalizeCustomerPhone } from "@/mocks/customers/state";
import { listOrders } from "@/mocks/orders/state";

/** `GET /api/v1/orders/?customer_phone=<phone>` (the M06 contract) → the customer's latest orders. */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/orders">) {
  const { phone } = await params;
  return mockRoute(
    request,
    ({ store, url }) => {
      const query = new URLSearchParams({ q: normalizeCustomerPhone(decodeURIComponent(phone)), page: url.searchParams.get("page") ?? "1", page_size: url.searchParams.get("page_size") ?? "20" });
      return mockJson(listOrders(store, query), { delay: 160 });
    },
    { permission: "customers.view" },
  );
}
