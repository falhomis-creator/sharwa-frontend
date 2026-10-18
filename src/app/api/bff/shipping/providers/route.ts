import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createProvider, listProviders } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET/POST /api/v1/shipping/providers/` — M15 §7, `[NEEDS BACKEND]`. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(listProviders(store, url.searchParams), { delay: 160 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createProvider(store, await readBody(request)), { delay: 220 }));
}
