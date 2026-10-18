import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createRestricted, listRestricted } from "@/mocks/shipping/ops";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET/POST /api/v1/shipping/restricted-zones/` — M15 §7, `[NEEDS BACKEND]`. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(listRestricted(store, url.searchParams), { delay: 160 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createRestricted(store, await readBody(request)), { delay: 220 }));
}
