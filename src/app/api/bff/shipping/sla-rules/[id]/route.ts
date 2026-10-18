import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteSla, patchSla } from "@/mocks/shipping/ops";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `PATCH/DELETE /api/v1/shipping/sla-rules/<id>/` — M15 §7, `[NEEDS BACKEND]`. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/shipping/sla-rules/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchSla(store, Number(id), await readBody(request)), { delay: 220 }));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/shipping/sla-rules/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? respond(deleteSla(store, Number(id)), { delay: 180 }));
}
