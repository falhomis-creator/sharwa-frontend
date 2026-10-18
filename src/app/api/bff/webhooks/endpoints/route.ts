import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { ownerOnly } from "@/mocks/integrations/guard";
import { createEndpoint, listEndpoints } from "@/mocks/integrations/webhooks";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/webhooks/endpoints/` `[NEEDS BACKEND]` — POST returns `secret` once (US-19.3.2). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? mockJson(listEndpoints(store), { delay: 150 }));
}
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(createEndpoint(store, await readBody(request))));
}
