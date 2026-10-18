import { mockRoute } from "@/lib/bff/mock-route";
import { ownerOnly } from "@/mocks/integrations/guard";
import { WEBHOOK_EVENTS } from "@/mocks/integrations/webhooks";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/webhooks/events/` `[NEEDS BACKEND]` — the subscribable events (FR-19.06). */
export async function GET(request: Request) {
  return mockRoute(request, ({ session }) => ownerOnly(session, "الـ Webhooks") ?? mockJson(WEBHOOK_EVENTS, { delay: 80 }));
}
