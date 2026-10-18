import { env } from "@/env";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { addDomain, listDomains } from "@/mocks/integrations/domains";
import { ownerOnly } from "@/mocks/integrations/guard";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/domains/` `[NEEDS BACKEND]` (M19 US-19.1, FR-19.01/03). Owner only. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "النطاقات") ?? mockJson(listDomains(store, env.TENANT_BASE_DOMAIN), { delay: 150 }));
}
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session, "النطاقات") ?? respond(addDomain(store, env.TENANT_BASE_DOMAIN, await readBody(request))));
}
