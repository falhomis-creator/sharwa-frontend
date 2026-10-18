import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { deleteSection, updateSection } from "@/mocks/design/state";

/** `PATCH/DELETE /api/v1/admin/sections/<pk>/` — Ready upstream (auth caveat, see the list route). */
const OWNER_ONLY = "تصميم المتجر مقصور على مالك المتجر.";

export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/admin/sections/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: OWNER_ONLY }, { status: 403 });
    return respond(updateSection(store, Number(id), await readBody(request)));
  });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/admin/sections/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: OWNER_ONLY }, { status: 403 });
    return respond(deleteSection(store, Number(id)));
  });
}
