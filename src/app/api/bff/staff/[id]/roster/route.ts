import { mockRoute, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { putRoster, roster } from "@/mocks/staff/state";

/** `GET/PUT /api/v1/staff/<id>/roster/` — 7 rows, `weekday 0 = الأحد` (US-18.4.4). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/roster">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store }) => mockJson(roster(store, id), { delay: 80 }), { permission: "staff.view" });
}

export async function PUT(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/roster">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    async ({ store }) => {
      const body: unknown = await request.json().catch(() => null);
      return respond(putRoster(store, id, body));
    },
    { permission: "staff.manage" },
  );
}
