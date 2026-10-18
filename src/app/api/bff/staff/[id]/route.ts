import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getStaff, patchStaff, sessionActor } from "@/mocks/staff/state";

/** `GET/PATCH /api/v1/staff/<id>/` (M18 §7). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/staff/[id]">) {
  const id = Number((await params).id);
  return mockRoute(
    request,
    ({ store }) => {
      const row = getStaff(store, id);
      return row ? mockJson(row, { delay: 120 }) : mockJson({ detail: "الموظف غير موجود." }, { status: 404 });
    },
    { permission: "staff.view" },
  );
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/staff/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => respond(patchStaff(store, id, await readBody(request), sessionActor(store, session).name)), {
    permission: "staff.manage",
  });
}
