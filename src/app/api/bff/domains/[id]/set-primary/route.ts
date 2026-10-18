import { mockRoute, respond } from "@/lib/bff/mock-route";
import { setPrimaryDomain } from "@/mocks/integrations/domains";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";

/** `POST /api/v1/domains/<id>/set-primary/` `[NEEDS BACKEND]` — only an `active` domain (US-19.1.4). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/domains/[id]/set-primary">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "النطاقات") ?? respond(setPrimaryDomain(store, id)));
}
