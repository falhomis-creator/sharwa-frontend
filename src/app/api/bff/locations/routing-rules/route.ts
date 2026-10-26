import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createRule, listRules } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `GET/POST /api/v1/locations/routing-rules/` (US-22.6). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listRules(store), { delay: 140 }));
}

async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createRule(store, await readBody(request)), { delay: 200 }));
}

// INT-025: `liveOrMock` module `locations` → Django `api/views_locations.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/routing-rules/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "locations", "/api/v1/locations/routing-rules/", () => mockPOST(request));
}
