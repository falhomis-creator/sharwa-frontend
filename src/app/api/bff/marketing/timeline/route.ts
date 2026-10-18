import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { createEvent, listEvents } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/timeline/` `?from&to` `[NEEDS BACKEND]` (M13 FR-13.06). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return mockJson(listEvents(store, url.searchParams), { delay: 120 });
  });
}
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الجدول الزمني مقصور على مالك المتجر." }, { status: 403 });
    return respond(createEvent(store, await readBody(request)));
  });
}
