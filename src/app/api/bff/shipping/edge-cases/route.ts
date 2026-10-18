import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listEdgeCases } from "@/mocks/shipping/ops";

/** `GET /api/v1/shipping/edge-cases/?kind=out_of_order|flagged|rejected|sla_breach&page` — staff with `orders.view` read it. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listEdgeCases(store, url.searchParams), { delay: 160 }), { permission: "orders.view" });
}
