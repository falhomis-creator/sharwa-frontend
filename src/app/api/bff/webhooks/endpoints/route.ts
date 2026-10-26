import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { ownerOnly } from "@/mocks/integrations/guard";
import { createEndpoint, listEndpoints } from "@/mocks/integrations/webhooks";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/webhooks/endpoints/` `[INT-023]` — POST returns `secret` once (US-19.3.2). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? mockJson(listEndpoints(store), { delay: 150 }));
}
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(createEndpoint(store, await readBody(request))));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "integrations", "/api/v1/webhooks/endpoints/", () => mockGET(request));
}
export async function POST(request: Request) {
  return liveOrMock(request, "integrations", "/api/v1/webhooks/endpoints/", () => mockPOST(request));
}
