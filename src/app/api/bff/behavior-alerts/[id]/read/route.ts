import { mockRoute, respond } from "@/lib/bff/mock-route";
import { readAlert } from "@/mocks/staff/state";

/** `POST /api/v1/behavior-alerts/<id>/read/`. */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/behavior-alerts/[id]/read">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => respond(readAlert(store, id)), { permission: "staff.view" });
}
