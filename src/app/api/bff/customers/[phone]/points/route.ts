import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { pointsTab } from "@/mocks/customers/state";

/** `GET /api/v1/customers/<phone>/points/` → `{balance, display_riyal_equivalent, program_enabled, transactions}`. */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/points">) {
  const { phone } = await params;
  return mockRoute(request, ({ store }) => mockJson(pointsTab(store, decodeURIComponent(phone)), { delay: 150 }), { permission: "customers.view" });
}
