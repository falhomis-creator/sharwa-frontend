import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { effectivePermissions } from "@/mocks/staff/state";

/** `GET /api/v1/staff/<id>/effective-permissions/?location_id` — the server's `permission_resolver` result (FR-18.05). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]/effective-permissions">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store, url }) => {
      const loc = url.searchParams.get("location_id");
      return mockJson(effectivePermissions(store, id, loc ? Number(loc) : null), { delay: 100 });
    },
    { permission: "staff.view" },
  );
}
