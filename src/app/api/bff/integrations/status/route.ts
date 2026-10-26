import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { listIntegrationStatuses } from "@/mocks/integrations/statuses";
import { mockJson } from "@/mocks/runtime";

/**
 * `GET /api/v1/integrations/status/` `[INT-023]` (M19 US-19.4). Any member; rows outside
 * the member's `channels.*` permissions are removed here (US-19.4.2).
 */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session }) => mockJson(listIntegrationStatuses(store, session), { delay: 150 }));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "integrations", "/api/v1/integrations/status/", () => mockGET(request));
}
