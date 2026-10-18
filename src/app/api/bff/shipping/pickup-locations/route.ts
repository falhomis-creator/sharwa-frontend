import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createPickup, listPickups } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET/POST /api/v1/shipping/pickup-locations/` — M15 §7, `[NEEDS BACKEND]`. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(listPickups(store, url.searchParams), { delay: 160 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createPickup(store, await readBody(request)), { delay: 220 }));
}
