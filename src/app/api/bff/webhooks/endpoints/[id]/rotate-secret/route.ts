import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { rotateSecret } from "@/mocks/integrations/webhooks";

/** `POST /api/v1/webhooks/endpoints/<id>/rotate-secret/` `[NEEDS BACKEND]` — the new secret once (§8). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/webhooks/endpoints/[id]/rotate-secret">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(rotateSecret(store, id)));
}
