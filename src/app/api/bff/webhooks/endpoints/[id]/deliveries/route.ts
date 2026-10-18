import { mockRoute, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { listDeliveries } from "@/mocks/integrations/webhooks";

/** `GET /api/v1/webhooks/endpoints/<id>/deliveries/?status&event&from&to&page` `[NEEDS BACKEND]` (FR-19.07). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/webhooks/endpoints/[id]/deliveries">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session, "الـ Webhooks") ?? respond(listDeliveries(store, id, url.searchParams), { delay: 150 }));
}
