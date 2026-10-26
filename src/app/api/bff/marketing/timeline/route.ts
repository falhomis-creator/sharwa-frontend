import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { createEvent, listEvents } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/timeline/` `?from&to` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.06). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return mockJson(listEvents(store, url.searchParams), { delay: 120 });
  });
}
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return respond(createEvent(store, await readBody(request)));
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/timeline/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/timeline/", () => mockPOST(request));
}
