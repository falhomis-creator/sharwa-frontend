import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { deleteRule, patchRule } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

export async function PATCH(request: Request, ctx: RouteContext<"/api/bff/locations/routing-rules/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(patchRule(store, Number(id), await readBody(request)), { delay: 200 }));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/bff/locations/routing-rules/[id]">) {
  const { id } = await ctx.params;
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? respond(deleteRule(store, Number(id))));
}
