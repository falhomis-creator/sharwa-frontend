import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createPackaging, listPackaging } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET/POST /api/v1/shipping/packaging-profiles/` — M15 §7, `live: INT-021`. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(listPackaging(store, url.searchParams), { delay: 160 }));
}

async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createPackaging(store, await readBody(request)), { delay: 220 }));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/packaging-profiles/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/packaging-profiles/", () => mockPOST(request));
}
