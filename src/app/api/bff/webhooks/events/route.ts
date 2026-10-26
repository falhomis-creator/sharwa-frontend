import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { ownerOnly } from "@/mocks/integrations/guard";
import { WEBHOOK_EVENTS } from "@/mocks/integrations/webhooks";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/webhooks/events/` `[INT-023]` — the subscribable events (FR-19.06). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ session }) => ownerOnly(session, "الـ Webhooks") ?? mockJson(WEBHOOK_EVENTS, { delay: 80 }));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "integrations", "/api/v1/webhooks/events/", () => mockGET(request));
}
