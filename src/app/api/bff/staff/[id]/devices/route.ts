import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { staffState } from "@/mocks/staff/state";

/** `GET /api/v1/staff/<id>/devices/` — `TrustedDevice` (US-18.4.3). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/devices">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(staffState(store).devices.filter((d) => d.staff_id === id), { delay: 100 }), { permission: "staff.view_sessions" });
}
