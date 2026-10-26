import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listAlerts } from "@/mocks/staff/state";

/** `GET /api/v1/behavior-alerts/?level&unread` (US-18.6.3). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listAlerts(store, url.searchParams), { delay: 120 }), { permission: "staff.view" });
}

// INT-022: `liveOrMock` module `staff` → Django `api/views_staff.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "staff", "/api/v1/behavior-alerts/", () => mockGET(request));
}
