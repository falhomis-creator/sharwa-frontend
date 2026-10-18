import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listAlerts } from "@/mocks/staff/state";

/** `GET /api/v1/behavior-alerts/?level&unread` (US-18.6.3). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listAlerts(store, url.searchParams), { delay: 120 }), { permission: "staff.view" });
}
