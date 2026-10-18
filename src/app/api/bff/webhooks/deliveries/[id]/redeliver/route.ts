import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { redeliver } from "@/mocks/integrations/webhooks";

/** `POST /api/v1/webhooks/deliveries/<id>/redeliver/` `[NEEDS BACKEND]` — failed only (SC-19.5). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/webhooks/deliveries/[id]/redeliver">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(redeliver(store, id), { delay: 300 }));
}
