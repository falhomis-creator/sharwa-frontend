import { mockRoute, respond } from "@/lib/bff/mock-route";
import { deleteDomain } from "@/mocks/integrations/domains";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";

/** `DELETE /api/v1/domains/<id>/` `[NEEDS BACKEND]` — the primary domain is never deleted (§8). */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/domains/[id]">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "النطاقات") ?? respond(deleteDomain(store, id)));
}
