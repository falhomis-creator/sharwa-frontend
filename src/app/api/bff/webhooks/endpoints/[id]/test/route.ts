import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { testEndpoint } from "@/mocks/integrations/webhooks";

/** `POST /api/v1/webhooks/endpoints/<id>/test/` `[NEEDS BACKEND]` — «إرسال حدث تجريبي» (US-19.3.4). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/webhooks/endpoints/[id]/test">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(testEndpoint(store, id), { delay: 400 }));
}
