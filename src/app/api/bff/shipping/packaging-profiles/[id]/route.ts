import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deletePackaging, patchPackaging } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `PATCH/DELETE /api/v1/shipping/packaging-profiles/<id>/` — M15 §7, `[NEEDS BACKEND]`. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/shipping/packaging-profiles/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchPackaging(store, Number(id), await readBody(request)), { delay: 220 }));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/shipping/packaging-profiles/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? respond(deletePackaging(store, Number(id)), { delay: 180 }));
}
