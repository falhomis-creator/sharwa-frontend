import { mockRoute } from "@/lib/bff/mock-route";
import { channelStatuses } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/bff/marketing/campaigns/channels` — which of the six channels is connected (M13 US-13.4.1; M27/M30 own the real status). */
export async function GET(request: Request) {
  return mockRoute(request, () => mockJson(channelStatuses(), { delay: 80 }));
}
