import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { channelStatuses } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/bff/marketing/campaigns/channels` — which of the six channels is connected (M13 US-13.4.1; M27/M30 own the real status). */
async function mockGET(request: Request) {
  return mockRoute(request, () => mockJson(channelStatuses(), { delay: 80 }));
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/campaigns/channels/", () => mockGET(request));
}
