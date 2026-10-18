import { mockRoute, respond } from "@/lib/bff/mock-route";
import { verifyDomain } from "@/mocks/integrations/domains";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";

/** `POST /api/v1/domains/<id>/verify/` `[NEEDS BACKEND]` — «تحقّق الآن» (US-19.1.3). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/domains/[id]/verify">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "النطاقات") ?? respond(verifyDomain(store, id)));
}
