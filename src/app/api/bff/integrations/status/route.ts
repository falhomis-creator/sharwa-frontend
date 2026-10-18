import { mockRoute } from "@/lib/bff/mock-route";
import { listIntegrationStatuses } from "@/mocks/integrations/statuses";
import { mockJson } from "@/mocks/runtime";

/**
 * `GET /api/v1/integrations/status/` `[NEEDS BACKEND]` (M19 US-19.4). Any member; rows outside
 * the member's `channels.*` permissions are removed here (US-19.4.2).
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => mockJson(listIntegrationStatuses(store, session), { delay: 150 }));
}
