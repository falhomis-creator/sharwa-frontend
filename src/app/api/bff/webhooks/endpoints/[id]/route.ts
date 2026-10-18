import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { deleteEndpoint, getEndpoint, patchEndpoint } from "@/mocks/integrations/webhooks";

/** `GET|PATCH|DELETE /api/v1/webhooks/endpoints/<id>/` `[NEEDS BACKEND]` (US-19.3). */
type Ctx = RouteContext<"/api/bff/webhooks/endpoints/[id]">;
export async function GET(request: Request, { params }: Ctx) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(getEndpoint(store, id)));
}
export async function PATCH(request: Request, { params }: Ctx) {
  const id = idFrom((await params).id);
  return mockRoute(request, async ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(patchEndpoint(store, id, await readBody(request))));
}
export async function DELETE(request: Request, { params }: Ctx) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(deleteEndpoint(store, id)));
}
